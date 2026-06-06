import { describe, expect, it } from "vitest";
import { buildHealthReport } from "../health";

describe("buildHealthReport", () => {
  it("reports ready configuration without leaking secrets", () => {
    const report = buildHealthReport(
      {
        TATUM_API_KEY: "secret-key",
        TATUM_SUI_NETWORK: "testnet",
        TATUM_SUI_RPC_URL: "https://sui-testnet.gateway.tatum.io/path?token=hidden",
        WALRUS_PUBLISHER_URL: "https://publisher.walrus.example/v1",
        WALRUS_AGGREGATOR_URL: "https://aggregator.walrus.example",
        WALRUS_EPOCHS: "2",
        NEXT_PUBLIC_APP_URL: "https://walsentinel.vercel.app",
        NODE_ENV: "production",
        VERCEL_ENV: "production"
      },
      new Date("2026-06-06T06:00:00.000Z")
    );

    expect(report.status).toBe("ready");
    expect(report.services.tatum.configured).toBe(true);
    expect(report.services.tatum.rpcUrl.origin).toBe("https://sui-testnet.gateway.tatum.io");
    expect(report.services.tatum.rpcUrl.path).toBe("/path");
    expect(report.services.walrus.epochs).toBe(2);
    expect(JSON.stringify(report)).not.toContain("secret-key");
    expect(JSON.stringify(report)).not.toContain("hidden");
  });

  it("reports degraded configuration for missing or invalid required services", () => {
    const report = buildHealthReport(
      {
        TATUM_API_KEY: "",
        WALRUS_PUBLISHER_URL: "not-a-url",
        WALRUS_AGGREGATOR_URL: "https://aggregator.walrus.example"
      },
      new Date("2026-06-06T06:00:00.000Z")
    );

    expect(report.status).toBe("degraded");
    expect(report.missing).toContain("TATUM_API_KEY");
    expect(report.invalid).toContain("WALRUS_PUBLISHER_URL");
    expect(report.services.tatum.network).toBe("testnet");
  });
});
