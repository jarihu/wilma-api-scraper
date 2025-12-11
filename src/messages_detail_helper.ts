/**
 * Helper for parsing message detail pages
 */

import * as cheerio from 'cheerio';
import { AxiosInstance } from 'axios';
import { WilmaHttpClient } from './http.js';

export interface MessageDetail {
  id: string;
  subject?: string | null;
  from?: string | null;
  date?: string | null;
  body?: string | null;
  has_attachments?: boolean;
  raw?: string;
}

/**
 * Service responsible for fetching and parsing message detail pages
 */
export class MessageDetailService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(client: AxiosInstance, baseUrl: string) {
    this.client = client;
    this.baseUrl = baseUrl;
  }

  /** Fetch and parse a single message detail page */
  async fetch(childId: string, messageId: string): Promise<MessageDetail> {
    const url = `${this.baseUrl}/!${childId}/messages/${messageId}?printable`;
    const res = await this.client.get(url, { headers: { 'User-Agent': WilmaHttpClient.userAgent() } });

    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    try {
      const $ = cheerio.load(text);
      const subject = $('h1, h2').first().text().trim() || null;

      let from: string | null = null;
      let date: string | null = null;

      if ($('meta[name="from"]').length) from = $('meta[name="from"]').attr('content') || null;
      if (!from && $('address').length) from = $('address').first().text().trim() || null;
      if ($('time').length) date = $('time').first().attr('datetime') || $('time').first().text().trim() || null;

      const tbl = $('table').first();
      if (tbl && tbl.length) {
        tbl.find('tr').each((_, tr) => {
          try {
            const th = $(tr).find('th').first();
            const td = $(tr).find('td').first();
            if (!th || !td) return;
            const label = (th.text() || '').trim().toLowerCase();
            const val = (td.text() || '').trim() || null;
            if (!from && label.includes('lähettäjä')) {
              from = val;
            }
            if (!date && (label.includes('lähetetty') || label.includes('lähetetty:') || label.includes('lähetetty '))) {
              date = val;
            }
          } catch (_e) {
            // ignore row parse errors
          }
        });
      }

      let bodyText: string | null = null;
      const bodySel =
        $('article').first().html() ||
        $('div.message-body').first().html() ||
        $('div#message').first().html() ||
        null;
      if (bodySel) {
        bodyText = (cheerio.load(bodySel) as any).text().trim() || null;
      } else if (tbl && tbl.length) {
        let collected = '';
        const between = tbl.nextUntil && tbl.nextUntil('.printout-footer');
        if (between && between.length) {
          between.each((_, el) => {
            collected += $(el).text() + '\n';
          });
        } else {
          tbl.nextAll().each((_, el) => {
            const cl = $(el);
            if (cl.hasClass('printout-footer')) return;
            collected += cl.text() + '\n';
          });
        }
        bodyText = collected.trim() || null;
      }

      const hasAttachments = !!$('a[href*="attachment"], a.attachment').length;
      return { id: messageId, subject, from, date, body: bodyText, has_attachments: hasAttachments };
    } catch (_e) {
      return { id: messageId, raw: text.slice(0, 2000) };
    }
  }
}
