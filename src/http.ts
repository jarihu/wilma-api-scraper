import axios, { AxiosInstance } from 'axios';
import { URL } from 'url';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

/**
 * HTTP client wrapper with cookie jar support for Wilma
 */
export class WilmaHttpClient {
  private client: AxiosInstance;
  private jar: CookieJar;
  private apiVersion: number | null = null;
  private baseUrl: URL | null = null;

  constructor() {
    this.jar = new CookieJar();
    this.client = axios.create({
      httpAgent: undefined,
      httpsAgent: undefined,
      validateStatus: () => true // Accept all status codes
    });

    wrapper(this.client);
    (this.client as any).defaults.jar = this.jar;
    (this.client as any).defaults.withCredentials = true;

    // Centralized response logging: warn on all non-2xx responses
    this.client.interceptors.response.use(
      (response) => {
        if (response.status < 200 || response.status >= 300) {
          const method = response.config.method?.toUpperCase() || '?';
          console.warn(`[Wilma] HTTP ${response.status} on ${method} ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        console.warn('[Wilma] HTTP request failed:', formatError(error));
        return Promise.reject(error);
      }
    );
  }

  /** Create a new HTTP client instance */
  static create(): WilmaHttpClient {
    return new WilmaHttpClient();
  }

  /** Access the underlying Axios instance */
  getClient(): AxiosInstance {
    return this.client;
  }

  /** Access the cookie jar for session management */
  getCookieJar(): CookieJar {
    return this.jar;
  }

  /**
   * Detect and cache the Wilma API version
   * @param baseUrl The base URL of the Wilma server
   * @returns The API version number or null if detection fails
   */
  async detectApiVersion(baseUrl: string | URL): Promise<number | null> {
    const normalized = typeof baseUrl === 'string' ? new URL(baseUrl) : baseUrl;
    if (this.apiVersion !== null && this.baseUrl && this.baseUrl.toString() === normalized.toString()) {
      return this.apiVersion;
    }

    try {
      this.baseUrl = normalized;
      const response = await this.client.get(new URL('/index_json', this.baseUrl).toString(), {
        headers: { 'User-Agent': WilmaHttpClient.userAgent() }
      });

      if (response.data?.ApiVersion) {
        this.apiVersion = response.data.ApiVersion;
        console.log(`[Wilma] API Version detected: ${this.apiVersion}`);
        return this.apiVersion;
      }
    } catch (error) {
      console.warn('[Wilma] Failed to detect API version:', error instanceof Error ? error.message : String(error));
    }

    return null;
  }

  /**
   * Get the cached API version (returns null if not yet detected)
   */
  getApiVersion(): number | null {
    return this.apiVersion;
  }

  /**
   * Log information about the Wilma client configuration
   */
  logInfo(): void {
    console.log('[Wilma] Client Configuration:');
    console.log(`  - Base URL: ${this.baseUrl || 'not set'}`);
    console.log(`  - API Version: ${this.apiVersion ?? 'not detected'}`);
    console.log(`  - User-Agent: ${WilmaHttpClient.userAgent()}`);
    console.log(`  - Cookie Jar: ${this.jar ? 'enabled' : 'disabled'}`);
  }

  /** Generate a consistent User-Agent string */
  static userAgent(): string {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }
}

// Convenience helpers for callers expecting functions
export function createWilmaClient(): { client: AxiosInstance; jar: CookieJar } {
  const instance = new WilmaHttpClient();
  return { client: instance.getClient(), jar: instance.getCookieJar() };
}

export function userAgent(): string {
  return WilmaHttpClient.userAgent();
}

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
