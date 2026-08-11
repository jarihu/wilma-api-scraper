import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WilmaAuthClient } from '../src/auth';

describe('WilmaAuthClient - Simple API', () => {
  describe('constructor', () => {
    it('should create with config only', () => {
      const auth = new WilmaAuthClient({
        baseUrl: 'https://test.wilma.fi'
      });

      expect(auth).toBeInstanceOf(WilmaAuthClient);
      expect(auth.getHttpClient()).toBeDefined();
    });

    it('should support custom httpClient in config', () => {
      const mockClient = {
        get: vi.fn(),
        post: vi.fn()
      } as any;

      const auth = new WilmaAuthClient({
        baseUrl: 'https://test.wilma.fi',
        httpClient: mockClient
      });

      expect(auth).toBeInstanceOf(WilmaAuthClient);
      expect(auth.getHttpClient()).toBe(mockClient);
    });
  });

  describe('service accessors', () => {
    let auth: WilmaAuthClient;

    beforeEach(() => {
      auth = new WilmaAuthClient({
        baseUrl: 'https://test.wilma.fi'
      });
    });

    it('should provide exams() accessor', () => {
      const examsClient = auth.exams();
      expect(examsClient).toBeDefined();
      expect(typeof examsClient.fetchCalendar).toBe('function');
    });

    it('should provide messages() accessor', () => {
      const messagesClient = auth.messages();
      expect(messagesClient).toBeDefined();
      expect(typeof messagesClient.fetchMessages).toBe('function');
    });

    it('should provide overview() accessor', () => {
      const overviewClient = auth.overview();
      expect(overviewClient).toBeDefined();
      expect(typeof overviewClient.fetchOverview).toBe('function');
      expect(typeof overviewClient.fetchOverviewRaw).toBe('function');
    });

    it('should share the same HTTP client across services', () => {
      const httpClient = auth.getHttpClient();
      const examsClient = auth.exams();
      const messagesClient = auth.messages();
      const overviewClient = auth.overview();

      // All services should use the same underlying HTTP client
      expect(examsClient['client']).toBe(httpClient);
      expect(messagesClient['client']).toBe(httpClient);
      expect(overviewClient['client']).toBe(httpClient);
    });
  });
});
