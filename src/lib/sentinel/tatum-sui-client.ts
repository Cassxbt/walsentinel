type Fetcher = typeof fetch;

interface TatumSuiClientOptions {
  apiKey: string;
  rpcUrl: string;
  fetcher?: Fetcher;
  maxAttempts?: number;
  retryDelayMs?: number;
}

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number;
  result: T;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
  };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

export class TatumSuiClient {
  private readonly apiKey: string;
  private readonly rpcUrl: string;
  private readonly fetcher: Fetcher;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;

  constructor(options: TatumSuiClientOptions) {
    this.apiKey = options.apiKey;
    this.rpcUrl = options.rpcUrl;
    this.fetcher = options.fetcher ?? fetch;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
  }

  async rpc<T>(method: string, params: unknown[] = []): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(this.rpcUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": this.apiKey
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params
          })
        });
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) {
          await wait(this.retryDelayMs * attempt);
          continue;
        }

        break;
      }

      if (!response.ok) {
        if (attempt < this.maxAttempts && isTransientStatus(response.status)) {
          await wait(this.retryDelayMs * attempt);
          continue;
        }

        throw new Error(`Tatum RPC HTTP ${response.status}`);
      }

      const payload = (await response.json()) as JsonRpcResponse<T>;
      if ("error" in payload) {
        throw new Error(`Tatum RPC error ${payload.error.code}: ${payload.error.message}`);
      }

      return payload.result;
    }

    throw lastError instanceof Error ? lastError : new Error("Tatum RPC request failed");
  }
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
