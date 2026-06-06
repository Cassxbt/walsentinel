import type { WalrusStoreResult } from "./types";

type Fetcher = typeof fetch;

interface WalrusClientOptions {
  publisherUrl: string;
  aggregatorUrl: string;
  epochs: number;
  fetcher?: Fetcher;
  maxAttempts?: number;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
}

interface NewlyCreatedResponse {
  newlyCreated: {
    blobObject: {
      id?: string;
      blobId: string;
      storage?: {
        endEpoch?: number;
      };
    };
  };
}

interface AlreadyCertifiedResponse {
  alreadyCertified: {
    blobId: string;
    event?: {
      txDigest?: string;
      eventSeq?: string;
    };
    endEpoch?: number;
  };
}

type WalrusStoreResponse = NewlyCreatedResponse | AlreadyCertifiedResponse;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function parseWalrusStoreResponse(raw: unknown): WalrusStoreResult {
  const response = raw as Partial<NewlyCreatedResponse & AlreadyCertifiedResponse>;

  if (response.newlyCreated?.blobObject?.blobId) {
    return {
      blobId: response.newlyCreated.blobObject.blobId,
      blobObjectId: response.newlyCreated.blobObject.id,
      endEpoch: response.newlyCreated.blobObject.storage?.endEpoch,
      raw
    };
  }

  if (response.alreadyCertified?.blobId) {
    return {
      blobId: response.alreadyCertified.blobId,
      txDigest: response.alreadyCertified.event?.txDigest,
      endEpoch: response.alreadyCertified.endEpoch,
      raw
    };
  }

  throw new Error("Walrus response did not include a blob ID");
}

export class WalrusClient {
  private readonly publisherUrl: string;
  private readonly aggregatorUrl: string;
  private readonly epochs: number;
  private readonly fetcher: Fetcher;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly requestTimeoutMs: number;

  constructor(options: WalrusClientOptions) {
    this.publisherUrl = trimTrailingSlash(options.publisherUrl);
    this.aggregatorUrl = trimTrailingSlash(options.aggregatorUrl);
    this.epochs = options.epochs;
    this.fetcher = options.fetcher ?? fetch;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
  }

  async storeJson(value: unknown): Promise<WalrusStoreResult> {
    const url = `${this.publisherUrl}/v1/blobs?epochs=${this.epochs}&permanent=true`;
    const response = await this.request(url, {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(value)
    });

    return parseWalrusStoreResponse((await response.json()) as WalrusStoreResponse);
  }

  async readJson<T>(blobId: string): Promise<T> {
    const response = await this.request(`${this.aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`);

    return (await response.json()) as T;
  }

  private async request(url: string, init?: RequestInit): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchWithTimeout(url, init);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) {
          await wait(this.retryDelayMs * attempt);
          continue;
        }

        break;
      }

      if (response.ok) {
        return response;
      }

      if (attempt < this.maxAttempts && isTransientStatus(response.status)) {
        await wait(this.retryDelayMs * attempt);
        continue;
      }

      throw new Error(`Walrus HTTP ${response.status}`);
    }

    throw lastError instanceof Error ? lastError : new Error("Walrus request failed");
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeoutMs);

    try {
      return await this.fetcher(url, {
        ...init,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Walrus request timed out");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
