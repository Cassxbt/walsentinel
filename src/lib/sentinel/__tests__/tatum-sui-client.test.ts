import { describe, expect, it, vi } from "vitest";
import { TatumSuiClient } from "../tatum-sui-client";

describe("TatumSuiClient", () => {
  it("sends JSON-RPC requests with the Tatum API key", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { totalBalance: "100" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });

    const client = new TatumSuiClient({
      apiKey: "test-key",
      rpcUrl: "https://sui-testnet.gateway.tatum.io",
      fetcher
    });

    const result = await client.rpc<{ totalBalance: string }>("suix_getBalance", ["0xabc"]);

    expect(result.totalBalance).toBe("100");
    expect(fetcher).toHaveBeenCalledWith(
      "https://sui-testnet.gateway.tatum.io",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": "test-key"
        })
      })
    );
  });

  it("throws on JSON-RPC errors", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -1, message: "bad" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });

    const client = new TatumSuiClient({
      apiKey: "test-key",
      rpcUrl: "https://sui-testnet.gateway.tatum.io",
      fetcher
    });

    await expect(client.rpc("sui_getObject", ["0xabc"])).rejects.toThrow("Tatum RPC error -1: bad");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries transient HTTP failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { totalBalance: "100" } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const client = new TatumSuiClient({
      apiKey: "test-key",
      rpcUrl: "https://sui-testnet.gateway.tatum.io",
      fetcher,
      retryDelayMs: 1
    });

    await expect(client.rpc<{ totalBalance: string }>("suix_getBalance", ["0xabc"])).resolves.toEqual({
      totalBalance: "100"
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient HTTP failures", async () => {
    const fetcher = vi.fn(async () => new Response("bad request", { status: 400 }));

    const client = new TatumSuiClient({
      apiKey: "test-key",
      rpcUrl: "https://sui-testnet.gateway.tatum.io",
      fetcher,
      retryDelayMs: 1
    });

    await expect(client.rpc("suix_getBalance", ["0xabc"])).rejects.toThrow("Tatum RPC HTTP 400");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
