/**
 * Messages parsing and fetching from Wilma
 */

import * as cheerio from 'cheerio';
import { AxiosInstance } from 'axios';
import { MessageDetailService, MessageDetail } from './messages_detail_helper.js';
import { WilmaHttpClient } from './http.js';

export interface MessageListItem {
  id: string;
  subject: string | null;
  from: string | null;
  date: string | null;
}

/**
 * Messages client for listing and fetching message details
 */
export class MessagesClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private detailService: MessageDetailService;

  constructor(client: AxiosInstance, baseUrl: string, detailService?: MessageDetailService) {
    this.client = client;
    this.baseUrl = baseUrl;
    this.detailService = detailService || new MessageDetailService(client, baseUrl);
  }

  /** Fetch messages from Wilma JSON list endpoint with HTML fallback */
  async fetchMessages(
    childId: string,
    pruneDays: number = 7
  ): Promise<{ list: MessageListItem[]; details: MessageDetail[] }> {
    const listApiUrl = `${this.baseUrl}/!${childId}/messages/list`;
    try {
      const apiRes = await this.client.get(listApiUrl, { headers: { 'User-Agent': WilmaHttpClient.userAgent() } });
      if (apiRes && apiRes.data) {
        let raw = apiRes.data;
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch (_e) {
            raw = null;
          }
        }

        const arr = Array.isArray(raw)
          ? raw
          : raw && Array.isArray(raw.Messages)
            ? raw.Messages
            : raw && (raw.list || raw.items || raw.messages)
              ? raw.list || raw.items || raw.messages
              : [];

        if (Array.isArray(arr) && arr.length > 0) {
          const cutoff = Date.now() - pruneDays * 24 * 60 * 60 * 1000;
          const filtered: MessageListItem[] = [];
          const details: MessageDetail[] = [];

          for (const it of arr) {
            const id = it.Id || it.id || it.messageId || it.mid || it.msg_id || null;
            const subject = it.Subject || it.subject || it.title || it.messageSubject || it.heading || null;
            const from = it.Sender || it.from || it.sender || it.senderName || it.author || null;
            const dateRaw = it.TimeStamp || it.date || it.sentAt || it.created_at || it.datetime || it.time || null;

            if (!id) continue;
            const parsed = dateRaw ? Date.parse(String(dateRaw)) : NaN;
            if (isNaN(parsed)) {
              continue;
            }

            if (parsed >= cutoff) {
              try {
                const d = await this.detailService.fetch(childId, String(id));
                details.push(d);
              } catch (_e) {
                // ignore failed detail fetch
              }
              filtered.push({ id: String(id), subject, from, date: dateRaw });
            }
          }

          return { list: filtered, details };
        }
      }
    } catch (_e) {
      // fall back to HTML parsing
    }

    const messagesUrl = `${this.baseUrl}/!${childId}/messages`;
    const res = await this.client.get(messagesUrl, { headers: { 'User-Agent': WilmaHttpClient.userAgent() } });
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    const $ = cheerio.load(body);
    const messages: Array<any> = [];
    const linkSelector = `a[href*="/!${childId}/messages/"]`;
    $(linkSelector).each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/\/messages\/(\d+)/);
      const id = m ? m[1] : null;
      const subject = $(el).text().trim() || null;
      const parent = $(el).closest('tr, li, div');
      const from = parent.find('.from, .sender, .message-from').first().text().trim() || null;
      const dateRaw =
        parent.find('time, .date, .message-date').first().attr('datetime') ||
        parent.find('time, .date, .message-date').first().text().trim() ||
        null;
      messages.push({ id, href, subject, from, date: dateRaw });
    });

    if (messages.length === 0) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/messages/')) {
          const m = href.match(/\/messages\/(\d+)/);
          const id = m ? m[1] : null;
          const subject = $(el).text().trim() || null;
          messages.push({ id, href, subject, date: null });
        }
      });
    }

    const cutoff = Date.now() - pruneDays * 24 * 60 * 60 * 1000;
    const filteredMessages: MessageListItem[] = [];
    const details: MessageDetail[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      let include = false;

      if (msg.date) {
        const parsed = Date.parse(String(msg.date));
        if (!isNaN(parsed) && parsed >= cutoff) {
          include = true;
        }
      }

      if (!include) {
        try {
          const d = await this.detailService.fetch(childId, msg.id);
          const parsed2 = d && d.date ? Date.parse(String(d.date)) : NaN;
          if (!isNaN(parsed2) && parsed2 >= cutoff) {
            include = true;
            details.push(d);
          }
        } catch (_e) {
          // ignore detail fetch failures
        }
      } else {
        try {
          const d = await this.detailService.fetch(childId, msg.id);
          details.push(d);
        } catch (_e) {
          // ignore detail fetch failures
        }
      }

      if (include) filteredMessages.push(msg);
    }

    return { list: filteredMessages, details };
  }
}
