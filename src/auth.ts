import { AxiosInstance, AxiosResponse } from 'axios';
import { WilmaHttpClient, userAgent, formatError } from './http.js';
import { URL } from 'url';
import { WilmaAuthError } from './errors.js';
import { ChildParser, ChildWithSchool } from './parser.js';
import { ExamsClient } from './exams.js';
import { MessagesClient } from './messages.js';
import { OverviewClient } from './overview.js';

/**
 * Token response from Wilma server
 */
interface TokenResponse {
  token: string;
  sessionValue?: string;
  sessionCookieName?: string;
}

/**
 * Configuration for Wilma authentication
 */
export interface WilmaAuthConfig {
  baseUrl: string | URL;
  usernameField?: string;
  passwordField?: string;
  httpClient?: AxiosInstance; // Optional: provide your own HTTP client
}

/**
 * Wilma Authentication Client
 * Handles token management, login/logout operations, and provides access to other Wilma services
 * Supports both cookie-based (old) and JWT-based (new) authentication
 * 
 * Can be used as a facade for all Wilma API operations
 */
export class WilmaAuthClient {
  private client: AxiosInstance;
  private httpClient: WilmaHttpClient | null = null;
  private baseUrl: URL;
  private usernameField: string;
  private passwordField: string;
  private sessionValue: string | undefined;
  private token: string | undefined;
  private sessionCookieName: string = 'Wilma2LoginID'; // Default for new JWT-based auth
  private children: ChildWithSchool[] = []; // Store parsed child information

  /**
   * Create a new Wilma authentication client
   * @param config - Configuration including baseUrl and optional httpClient
   */
  constructor(config: WilmaAuthConfig) {
    if (config.httpClient) {
      this.client = config.httpClient;
    } else {
      this.httpClient = WilmaHttpClient.create();
      this.client = this.httpClient.getClient();
    }
    this.baseUrl = typeof config.baseUrl === 'string' ? new URL(config.baseUrl) : config.baseUrl;
    this.usernameField = config.usernameField || 'Login';
    this.passwordField = config.passwordField || 'Password';
  }

  /**
   * Get the underlying Axios HTTP client
   * Useful for advanced users who need direct HTTP access
   */
  getHttpClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Fetch authentication token and session from Wilma server
   * Supports both old (/token endpoint) and new (/index_json endpoint) API formats
   */
  private async fetchToken(): Promise<TokenResponse> {
    let sessionValue: string | undefined;
    let sessionCookieName: string = 'Wilma2LoginID';
    let tokenValue: string = '';

    // Try new API format first (/index_json returns SessionID in response body)
    try {
      const indexJsonPath = '/index_json';
      const res = await this.client.get(new URL(indexJsonPath, this.baseUrl).toString(), {
        headers: { 'User-Agent': userAgent() }
      });

      // New Wilma API (v30+) returns SessionID as JWT in response body
      if (res.data?.SessionID) {
        sessionValue = res.data.SessionID;
        tokenValue = res.data.SessionID;
        sessionCookieName = 'Wilma2LoginID';
        return { token: tokenValue, sessionValue, sessionCookieName };
      }
    } catch (err) {
      console.warn('[Wilma] Failed to fetch token via /index_json, trying legacy endpoint:', formatError(err));
    }

    // Fall back to old API format (/token endpoint with set-cookie headers)
    try {
      const tokenPath = '/token';
      const res = await this.client.get(new URL(tokenPath, this.baseUrl).toString(), {
        headers: { 'User-Agent': userAgent() }
      });

      const setCookie = res.headers['set-cookie'];
      if (Array.isArray(setCookie)) {
        // Try Wilma2LoginID first (newest versions), then Wilma2SID, fallback to JSESSIONID
        let sessionCookie = setCookie.find((cookie) => cookie.startsWith('Wilma2LoginID='));
        if (sessionCookie) {
          const match = sessionCookie.match(/Wilma2LoginID=([^;]+)/);
          sessionValue = match ? match[1] : undefined;
          sessionCookieName = 'Wilma2LoginID';
        } else {
          sessionCookie = setCookie.find((cookie) => cookie.startsWith('Wilma2SID='));
          if (sessionCookie) {
            const match = sessionCookie.match(/Wilma2SID=([^;]+)/);
            sessionValue = match ? match[1] : undefined;
            sessionCookieName = 'Wilma2SID';
          } else {
            sessionCookie = setCookie.find((cookie) => cookie.startsWith('JSESSIONID='));
            if (sessionCookie) {
              const match = sessionCookie.match(/JSESSIONID=([^;]+)/);
              sessionValue = match ? match[1] : undefined;
              sessionCookieName = 'JSESSIONID';
            }
          }
        }
      }

      tokenValue = res.data?.Wilma2LoginID || res.data?.token || '';
    } catch (err) {
      console.warn('[Wilma] Failed to fetch token via /token:', formatError(err));
      throw new WilmaAuthError('Failed to fetch token from Wilma server (neither /index_json nor /token endpoints available)');
    }

    return {
      token: tokenValue,
      sessionValue,
      sessionCookieName
    };
  }

  /**
   * Perform login with username and password
   * After successful login, automatically parses and stores child information (name, school, class)
   * @returns HTML content of the landing page after login
   * @throws Error if login fails
   */
  async login(username: string, password: string): Promise<string> {
    // Get session token first
    const tokenResponse = await this.fetchToken();

    if (!tokenResponse.sessionValue) {
      throw new WilmaAuthError('Failed to obtain session token from Wilma server');
    }

    this.sessionValue = tokenResponse.sessionValue;
    this.token = tokenResponse.token;
    this.sessionCookieName = tokenResponse.sessionCookieName || 'Wilma2LoginID';

    const loginPath = '/login';
    const formData = new URLSearchParams();
    formData.append(this.usernameField, username);
    formData.append(this.passwordField, password);
    formData.append('SESSIONID', this.sessionValue);

    // Explicitly set the session cookie in the Cookie header
    const cookieHeader = `enableAnalytics_56553=false; ${this.sessionCookieName}=${this.sessionValue}`;

    const res = await this.client.post(new URL(loginPath, this.baseUrl).toString(), formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'User-Agent': userAgent()
      },
      maxRedirects: 5,
      validateStatus: () => true
    });

    // Success is 200 OK (after following redirects) or redirect status
    if (res.status === 200 || (res.status >= 302 && res.status <= 308)) {
      // If we got HTML content directly, parse and store children
      if (res.data && typeof res.data === 'string' && res.data.length > 0) {
        this.parseAndStoreChildren(res.data);
        return res.data;
      }
      
      // Otherwise fetch landing page and parse it
      const html = await this.getLandingPage();
      this.parseAndStoreChildren(html);
      return html;
    }

    throw new WilmaAuthError(`Login failed with status ${res.status}`, res.status);
  }

  /**
   * Fetch the landing page HTML (useful after login to extract children info)
   * Automatically parses and stores child information
   * @returns HTML content of the landing page
   * @throws Error if fetch fails
   */
  async getLandingPage(): Promise<string> {
    const res = await this.client.get(this.baseUrl.toString(), {
      headers: {
        'User-Agent': userAgent()
      },
      validateStatus: () => true
    });

    if (res.status !== 200) {
      throw new WilmaAuthError(`Failed to fetch landing page: ${res.status}`, res.status);
    }

    this.parseAndStoreChildren(res.data);
    return res.data;
  }

  /**
   * Parse children information from HTML and store it internally
   * @param html - The landing page HTML
   */
  private parseAndStoreChildren(html: string): void {
    try {
      this.children = ChildParser.extractChildren(html);
    } catch (err) {
      // If parsing fails, log but don't throw - allow client to continue
      console.warn('Failed to parse child information from landing page:', err);
    }
  }

  /**
   * Perform logout from Wilma server
   */
  async logout(): Promise<AxiosResponse<unknown>> {
    const logoutPath = '/logout';
    const res = await this.client.get(`${this.baseUrl}${logoutPath}`, {
      headers: {
        'User-Agent': userAgent()
      },
      maxRedirects: 5
    });

    // Clear session and child data after logout
    this.sessionValue = undefined;
    this.token = undefined;
    this.children = [];

    return res;
  }

  /**
   * Get the current session value
   */
  getSessionValue(): string | undefined {
    return this.sessionValue;
  }

  /**
   * Get the current token
   */
  getToken(): string | undefined {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.sessionValue && this.token);
  }

  /**
   * Get all children with their school and class information
   * Automatically populated after successful login
   * @returns Array of children with id, name, schoolName, and className
   */
  getChildren(): ChildWithSchool[] {
    return this.children;
  }

  /**
   * Get a specific child by ID with school and class information
   * @param childId - The child ID to search for
   * @returns The child with school and class information, or undefined if not found
   */
  getChild(childId: string): ChildWithSchool | undefined {
    return this.children.find(child => child.id === childId);
  }

  /**
   * Create an ExamsClient instance for this authenticated session
   * @returns ExamsClient instance using the same HTTP client
   */
  exams(): ExamsClient {
    return new ExamsClient(this.client, this.baseUrl);
  }

  /**
   * Create a MessagesClient instance for this authenticated session
   * @returns MessagesClient instance using the same HTTP client
   */
  messages(): MessagesClient {
    return new MessagesClient(this.client, this.baseUrl);
  }

  /**
   * Create an OverviewClient instance for this authenticated session
   * @returns OverviewClient instance using the same HTTP client
   */
  overview(): OverviewClient {
    return new OverviewClient(this.client, this.baseUrl);
  }
}

// Re-export child types for convenience
export type { ChildWithSchool, ChildEntry, SchoolAndClass } from './parser';