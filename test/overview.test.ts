import { describe, it, expect, vi } from 'vitest';
import { OverviewClient } from '../src/overview';
import { AxiosInstance } from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load test data
const overviewJsonPath = join(__dirname, 'fixtures/overview.json');
const overviewData = JSON.parse(readFileSync(overviewJsonPath, 'utf-8'));

describe('OverviewClient', () => {
  const mockAxios = {
    get: vi.fn()
  } as unknown as AxiosInstance;

  const baseUrl = 'https://test-wilma.edu';
  const client = new OverviewClient(mockAxios, baseUrl);

  describe('fetchOverview()', () => {
    it('should fetch and parse overview data', async () => {
      // Mock axios response
      (mockAxios.get as any).mockResolvedValueOnce({
        data: overviewData
      });

      const result = await client.fetchOverview('12345');

      expect(mockAxios.get).toHaveBeenCalledWith(
        `${baseUrl}/overview_json?child=12345`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      );

      // Check structure
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('schedule');
      expect(result).toHaveProperty('groups');
      expect(Array.isArray(result.schedule)).toBe(true);
      expect(Array.isArray(result.groups)).toBe(true);
      
      // Verify parsed data from test JSON
      expect(result.role).toBe('guardian');
      expect(result.schedule.length).toBeGreaterThan(0);
      expect(result.groups.length).toBeGreaterThan(0);
      
      // Check first group has expected fields
      const firstGroup = result.groups[0];
      expect(firstGroup).toHaveProperty('id');
      expect(firstGroup).toHaveProperty('name');
      expect(firstGroup).toHaveProperty('teachers');
      expect(firstGroup).toHaveProperty('homework');
      expect(firstGroup).toHaveProperty('diary');
      expect(firstGroup).toHaveProperty('exams');
    });
  });

  describe('fetchOverviewRaw()', () => {
    it('should fetch raw overview data without parsing', async () => {
      // Mock axios response
      (mockAxios.get as any).mockResolvedValueOnce({
        data: overviewData
      });

      const result = await client.fetchOverviewRaw('12345');

      expect(mockAxios.get).toHaveBeenCalledWith(
        `${baseUrl}/overview_json?child=12345`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      );

      expect(result).toBe(overviewData);
    });
  });

  describe('HTML fallback when /overview_json returns HTML', () => {
    const mockAxiosWithPost = {
      get: vi.fn(),
      post: vi.fn()
    } as unknown as AxiosInstance;

    const client = new OverviewClient(mockAxiosWithPost, baseUrl);

    const htmlShell = '<html><body><input name="formkey" value="formkey-abc-123"></body></html>';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('fetchOverview() should fall back to legacy form flow when /overview_json returns HTML string', async () => {
      (mockAxiosWithPost.get as any)
        .mockResolvedValueOnce({ data: htmlShell })       // /overview_json returns HTML string
        .mockResolvedValueOnce({ data: htmlShell });       // !childId/ home page

      (mockAxiosWithPost.post as any).mockResolvedValueOnce({
        data: overviewData
      });

      const result = await client.fetchOverview('12345');

      expect((mockAxiosWithPost.get as any)).toHaveBeenCalledTimes(2);
      expect((mockAxiosWithPost.get as any)).toHaveBeenNthCalledWith(1,
        `${baseUrl}/overview_json?child=12345`,
        expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) })
      );
      expect((mockAxiosWithPost.get as any)).toHaveBeenNthCalledWith(2,
        `${baseUrl}/!12345/`,
        expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) })
      );

      expect((mockAxiosWithPost.post as any)).toHaveBeenCalledTimes(1);
      expect((mockAxiosWithPost.post as any)).toHaveBeenCalledWith(
        `${baseUrl}/!12345/overview`,
        expect.stringContaining('formkey=formkey-abc-123'),
        expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' }) })
      );

      expect(result).toHaveProperty('groups');
      expect(result).toHaveProperty('schedule');
    });

    it('fetchOverviewRaw() should fall back to legacy form flow when /overview_json returns HTML string', async () => {
      (mockAxiosWithPost.get as any)
        .mockResolvedValueOnce({ data: htmlShell })       // /overview_json returns HTML string
        .mockResolvedValueOnce({ data: htmlShell });       // !childId/ home page

      const legacyRawData = { Groups: [], Schedule: [] };
      (mockAxiosWithPost.post as any).mockResolvedValueOnce({
        data: legacyRawData
      });

      const result = await client.fetchOverviewRaw('12345');

      expect((mockAxiosWithPost.get as any)).toHaveBeenCalledTimes(2);
      expect((mockAxiosWithPost.post as any)).toHaveBeenCalledTimes(1);

      expect(result).toBe(legacyRawData);
    });
  });
});
