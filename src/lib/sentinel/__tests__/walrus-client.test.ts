import { describe, expect, it, vi } from "vitest";
import { parseWalrusStoreResponse, WalrusClient } from "../walrus-client";

describe("parseWalrusStoreResponse", () => {
  it("parses newly created responses", () => {
    expect(
      parseWalrusStoreResponse({
        newlyCreated: {
          blobObject: {
            id: "0xblob",
            blobId: "blob-123",
            storage: { endEpoch: 12 }
          }
        }
      })
    ).toMatchObject({
      blobId: "blob-123",
      blobObjectId: "0xblob",
      endEpoch: 12
    });
  });

  it("parses already certified responses", () => {
    expect(
      parseWalrusStoreResponse({
        alreadyCertified: {
          blobId: "blob-456",
          event: { txDigest: "digest-456" },
          endEpoch: 13
        }
      })
    ).toMatchObject({
      blobId: "blob-456",
      txDigest: "digest-456",
      endEpoch: 13
    });
  });
});

describe("WalrusClient", () => {
  it("uploads evidence packs to the publisher", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ alreadyCertified: { blobId: "blob-789", endEpoch: 14 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });

    const client = new WalrusClient({
      publisherUrl: "https://publisher.example",
      aggregatorUrl: "https://aggregator.example",
      epochs: 1,
      fetcher
    });

    const result = await client.storeJson({ hello: "walrus" });

    expect(result.blobId).toBe("blob-789");
    expect(fetcher).toHaveBeenCalledWith(
      "https://publisher.example/v1/blobs?epochs=1&permanent=true",
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("reads JSON blobs from the aggregator", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });

    const client = new WalrusClient({
      publisherUrl: "https://publisher.example",
      aggregatorUrl: "https://aggregator.example",
      epochs: 1,
      fetcher
    });

    await expect(client.readJson("blob-123")).resolves.toEqual({ ok: true });
  });

  it("retries transient publisher failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ alreadyCertified: { blobId: "blob-retry", endEpoch: 14 } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const client = new WalrusClient({
      publisherUrl: "https://publisher.example",
      aggregatorUrl: "https://aggregator.example",
      epochs: 1,
      fetcher,
      retryDelayMs: 1
    });

    await expect(client.storeJson({ hello: "walrus" })).resolves.toMatchObject({
      blobId: "blob-retry"
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient publisher failures", async () => {
    const fetcher = vi.fn(async () => new Response("bad request", { status: 400 }));

    const client = new WalrusClient({
      publisherUrl: "https://publisher.example",
      aggregatorUrl: "https://aggregator.example",
      epochs: 1,
      fetcher,
      retryDelayMs: 1
    });

    await expect(client.storeJson({ hello: "walrus" })).rejects.toThrow("Walrus HTTP 400");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
