import { v4 as uuidV4 } from "uuid";
import { APIError } from "@/errors";
import { jsonStringify, sleep } from "@/utils";

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

type RequestOptions = {
  method: string;
  path: string;
  body?: unknown;
  timeout?: number;
  queryParams?: Record<string, string | number | boolean>;
  /** Number of retry attempts for transient failures. Default: 0 (no retry). */
  retries?: number;
  /** Base delay (ms) before the first retry; doubles each attempt (exponential backoff). Default: 1000. */
  retryDelay?: number;
  /** HTTP status codes eligible for retry. Default: [408, 429, 500, 502, 503, 504]. */
  retryableStatusCodes?: number[];
  /** Override the client's default base URL (e.g. point sync routes at the indexer, user/auth at the metadata service). */
  baseUrl?: string;
  /**
   * Identity policy for this request. "none" (default): NEVER attach the JWT —
   * the handle-bearing bearer token must not ride on relayer/indexer traffic in
   * a privacy protocol. "bearer": attach it (metadata auth/issuance routes only).
   */
  auth?: "bearer" | "none";
  /** Extra headers (e.g. a single-use `Authorization: PrivateToken …` value). */
  headers?: Record<string, string>;
};

/** Exponential backoff with full jitter, capped at {@link MAX_RETRY_DELAY}. */
function jitteredDelay(baseDelay: number, attempt: number): number {
  const exponential = baseDelay * 2 ** attempt;
  const jitter = exponential * (0.5 + Math.random() * 0.5);
  return Math.min(jitter, MAX_RETRY_DELAY);
}

class HttpClient {
  #bearerToken?: string;
  #onTokenChange?: (token: string | undefined) => void;
  #onUnauthorized?: (statusCode: number, requestId?: string) => void;
  readonly #fetch: typeof globalThis.fetch;
  protected readonly apiBaseUrl: string;

  constructor(apiBaseUrl?: string, customFetch?: typeof globalThis.fetch) {
    this.apiBaseUrl = apiBaseUrl || "https://api.curvy.box";
    this.#fetch = customFetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Register a callback that fires whenever the bearer token changes. */
  setOnTokenChange(callback: ((token: string | undefined) => void) | undefined): void {
    this.#onTokenChange = callback;
  }

  /** Register a callback that fires when an authenticated request is rejected with 401. */
  setOnUnauthorized(callback: ((statusCode: number, requestId?: string) => void) | undefined): void {
    this.#onUnauthorized = callback;
  }

  // Method to update the bearer token (for token refresh scenarios)
  protected _updateBearerToken(bearer: string | undefined): void {
    this.#bearerToken = bearer;
    this.#onTokenChange?.(bearer);
  }

  get bearerToken(): string | undefined {
    return this.#bearerToken;
  }

  private getHeaders(
    requestId: string,
    auth: "bearer" | "none",
    extra?: Record<string, string>,
  ): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "curvy-sdk",
      "X-Request-ID": requestId,
    };

    if (auth === "bearer" && this.#bearerToken) {
      baseHeaders.Authorization = `Bearer ${this.#bearerToken}`;
    }

    return extra ? { ...baseHeaders, ...extra } : baseHeaders;
  }

  protected async request<T extends object | null>({
    method,
    path,
    body,
    timeout = DEFAULT_TIMEOUT,
    queryParams,
    retries = 0,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
    baseUrl,
    auth = "none",
    headers,
  }: RequestOptions): Promise<T> {
    const requestId = uuidV4();
    // Capture once: only a bearer-authenticated 401 should trigger the re-auth signal.
    const hadBearer = auth === "bearer" && this.#bearerToken !== undefined;
    let lastError: APIError | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(jitteredDelay(retryDelay, attempt - 1));

      try {
        return await this.#executeRequest<T>(
          { method, path, body, timeout, queryParams, baseUrl, auth, headers },
          requestId,
        );
      } catch (error) {
        lastError =
          error instanceof APIError
            ? error
            : new APIError(`Request failed: ${(error as Error).message}`, undefined, error, requestId);

        // Network errors (no status code) are retryable; otherwise only the configured codes.
        const isRetryable = lastError.statusCode === undefined || retryableStatusCodes.includes(lastError.statusCode);

        if (attempt >= retries || !isRetryable) {
          if (lastError.statusCode === 401 && hadBearer) {
            this.#onUnauthorized?.(lastError.statusCode, lastError.requestId);
          }
          throw lastError;
        }
      }
    }

    // Unreachable (the loop always returns or throws), but satisfies the type checker.
    throw lastError;
  }

  /**
   * Binary POST (Privacy Pass issuance): raw request/response bytes with an
   * explicit content type — outside the JSON envelope `request` enforces.
   */
  protected async requestBinary({
    path,
    baseUrl,
    body,
    contentType,
    auth = "none",
    timeout = DEFAULT_TIMEOUT,
  }: {
    path: string;
    baseUrl?: string;
    body: Uint8Array;
    contentType: string;
    auth?: "bearer" | "none";
    timeout?: number;
  }): Promise<Uint8Array> {
    const requestId = uuidV4();
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const headers = this.getHeaders(requestId, auth);
      headers["Content-Type"] = contentType;

      const response = await this.#fetch(`${baseUrl ?? this.apiBaseUrl}${path}`, {
        method: "POST",
        headers,
        // Copy into a fresh ArrayBuffer-backed view — RequestInit rejects SharedArrayBuffer-typed views.
        body: new Uint8Array(body),
        signal: abortController.signal,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new APIError(response.statusText, response.status, await response.text(), requestId);
      }
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(`Request failed: ${(error as Error).message}`, undefined, error, requestId);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async #executeRequest<T extends object | null>(
    {
      method,
      path,
      body,
      timeout = DEFAULT_TIMEOUT,
      queryParams,
      baseUrl,
      auth = "none",
      headers,
    }: Omit<RequestOptions, "retries" | "retryDelay" | "retryableStatusCodes">,
    requestId: string,
  ): Promise<T> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const url = new URL(`${baseUrl ?? this.apiBaseUrl}${path}`);
      if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
          url.searchParams.append(key, String(value));
        }
      }

      const response = await this.#fetch(url.toString(), {
        method,
        headers: this.getHeaders(requestId, auth, headers),
        body: body ? jsonStringify(body) : undefined,
        signal: abortController.signal,
      });

      // NB: do NOT clear the abort timer here — the body has not been read yet.
      // A stalled response body would otherwise hang past `timeout`. The timer
      // is disarmed only in `finally`, once the body has been fully consumed.

      if (response.status < 200 || response.status >= 300) {
        throw new APIError(response.statusText, response.status, await response.text(), requestId);
      }

      // Read the body as text once, then parse — a `Response` body stream can
      // only be consumed once, so re-reading it (json() then text()) throws.
      const rawText = await response.text();
      let responseBody: T;
      try {
        responseBody = JSON.parse(rawText) as T;
      } catch (_e) {
        throw new APIError("Invalid JSON response", response.status, rawText, requestId);
      }

      if (responseBody && "data" in responseBody && "error" in responseBody) {
        if (responseBody.error !== undefined && responseBody.data === undefined) {
          throw new APIError(
            (responseBody.error as string) || `HTTP ${response.status}`,
            response.status,
            responseBody,
            requestId,
          );
        }

        if (responseBody.data === undefined) {
          throw new APIError("Missing data in response", response.status, responseBody, requestId);
        }
      }

      return responseBody;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(`Request failed: ${(error as Error).message}`, undefined, error, requestId);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export { HttpClient };
