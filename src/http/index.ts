import { APIError } from "@/errors";
import { jsonStringify } from "@/utils";

const DEFAULT_TIMEOUT = 5000;

type RequestOptions = {
  method: string;
  path: string;
  body?: unknown;
  timeout?: number;
  queryParams?: Record<string, string | number | boolean>;
};

class HttpClient {
  #apiKey: string;
  #bearerToken?: string;
  protected readonly apiBaseUrl: string;

  constructor(apiKey: string, apiBaseUrl?: string) {
    this.#apiKey = apiKey;
    this.apiBaseUrl = apiBaseUrl || "https://api.curvy.box";
  }

  // Method to update the bearer token (for token refresh scenarios)
  protected _updateBearerToken(bearer: string | undefined): void {
    this.#bearerToken = bearer;
  }

  private getHeaders(): Record<string, string> {
    const baseHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "curvy-sdk",
      "X-Curvy-API-Key": this.#apiKey,
    };

    if (this.#bearerToken) {
      return {
        ...baseHeaders,
        Authorization: `Bearer ${this.#bearerToken}`,
      };
    }

    return baseHeaders;
  }

  protected async request<T extends object | null>({
    method,
    path,
    body,
    timeout = DEFAULT_TIMEOUT,
    queryParams,
  }: RequestOptions): Promise<T> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const url = new URL(`${this.apiBaseUrl}${path}`);
      if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
          url.searchParams.append(key, String(value));
        }
      }

      const response = await fetch(url.toString(), {
        method,
        headers: this.getHeaders(),
        body: body ? jsonStringify(body) : undefined,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (response.status < 200 || response.status >= 300) {
        throw new APIError(response.statusText, response.status, await response.text());
      }

      let responseBody: T;
      try {
        responseBody = (await response.json()) as T;
      } catch (_e) {
        throw new APIError("Invalid JSON response", response.status, await response.text());
      }

      if (responseBody && "data" in responseBody && "error" in responseBody) {
        if (responseBody.error !== undefined && responseBody.data === undefined) {
          throw new APIError(
            (responseBody.error as string) || `HTTP ${response.status}`,
            response.status,
            responseBody,
          );
        }

        if (responseBody.data === undefined) {
          throw new APIError("Missing data in response", response.status, responseBody);
        }
      }

      return responseBody;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(`Request failed: ${(error as Error).message}`, undefined, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export { HttpClient };
