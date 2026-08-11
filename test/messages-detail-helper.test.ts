import { describe, it, expect, vi } from 'vitest';
import { MessageDetailService } from '../src/messages_detail_helper';

function mockAxios(data: unknown) {
  return {
    get: vi.fn().mockResolvedValue({ data })
  } as any;
}

const sampleHtml = `
<html>
<body>
  <h1>Tervetuloa Wilmaan</h1>
  <table>
    <tr><th>Lähettäjä:</th><td>Maija Opettaja</td></tr>
    <tr><th>Lähetetty:</th><td>1.12.2025 14:30</td></tr>
  </table>
  <div class="message-body">Tämä on viestin runko.</div>
</body>
</html>
`;

const sampleHtmlAltSelectors = `
<html>
<body>
  <h2>Test Subject</h2>
  <address>Test Sender</address>
  <time datetime="2025-12-01T14:30:00">1.12.2025</time>
  <article><p>Article body content.</p></article>
</body>
</html>
`;

describe('MessageDetailService', () => {
  describe('fetch()', () => {
    it('should parse message detail from HTML with table rows', async () => {
      const axios = mockAxios(sampleHtml);
      const service = new MessageDetailService(axios, 'https://wilma.example.com');

      const result = await service.fetch('12345', '9876');

      expect(result.id).toBe('9876');
      expect(result.subject).toBe('Tervetuloa Wilmaan');
      expect(result.from).toBe('Maija Opettaja');
      expect(result.date).toBe('1.12.2025 14:30');
      expect(result.body).toBe('Tämä on viestin runko.');
      expect(result.has_attachments).toBe(false);

      expect(axios.get).toHaveBeenCalledWith(
        'https://wilma.example.com/!12345/messages/9876?printable',
        expect.any(Object)
      );
    });

    it('should parse using alternative selectors (address, time, article)', async () => {
      const axios = mockAxios(sampleHtmlAltSelectors);
      const service = new MessageDetailService(axios, 'https://wilma.example.com');

      const result = await service.fetch('12345', '42');

      expect(result.subject).toBe('Test Subject');
      expect(result.from).toBe('Test Sender');
      expect(result.date).toBe('2025-12-01T14:30:00');
      expect(result.body).toBe('Article body content.');
    });

    it('should handle empty HTML gracefully', async () => {
      const axios = mockAxios('<html><body></body></html>');
      const service = new MessageDetailService(axios, 'https://wilma.example.com');

      const result = await service.fetch('12345', '1');

      expect(result.id).toBe('1');
      expect(result.subject).toBeNull();
    });

    it('should detect attachment links', async () => {
      const html = `
        <html><body>
          <a href="attachment/123">file.pdf</a>
        </body></html>
      `;
      const axios = mockAxios(html);
      const service = new MessageDetailService(axios, 'https://wilma.example.com');

      const result = await service.fetch('12345', '1');

      expect(result.has_attachments).toBe(true);
    });

    it('should return raw data when cheerio parsing throws', async () => {
      const axios = mockAxios('<not>valid<');
      const service = new MessageDetailService(axios, 'https://wilma.example.com');

      const result = await service.fetch('12345', '1');
      expect(result.id).toBe('1');
    });

    it('should accept baseUrl as string or URL', async () => {
      const axios = mockAxios(sampleHtml);
      const service = new MessageDetailService(axios, 'https://wilma.example.com');

      await service.fetch('12345', '42');
      expect(axios.get).toHaveBeenCalledWith(
        'https://wilma.example.com/!12345/messages/42?printable',
        expect.any(Object)
      );
    });
  });
});
