import { AxiosInstance } from 'axios';
import { URL } from 'url';
import * as cheerio from 'cheerio';
import { parse, startOfDay, isAfter, isEqual } from 'date-fns';
import { fi } from 'date-fns/locale';
import { WilmaHttpClient } from './http.js';

/**
 * Parsed exam entry with dates and details
 */
export interface ExamEntry {
  wilmaId: number;
  date: string;
  dateIso: string;
  subject: string;
  description: string | null;
  teacher: string | null;
  teachers: string[];
  summary: string;
  notes: string | null;
  fetchedAt: Date;
}

/**
 * Exams client for fetching and parsing exam calendars
 */
export class ExamsClient {
  private client: AxiosInstance;
  private baseUrl: URL;

  constructor(client: AxiosInstance, baseUrl: string | URL) {
    this.client = client;
    this.baseUrl = typeof baseUrl === 'string' ? new URL(baseUrl) : baseUrl;
  }

  /**
   * Fetch and parse exam calendar for a child.
   * @param childId - The child ID
   * @param opts - Optional date range (ISO 8601 dates, e.g. "2025-01-01")
   */
  async fetchCalendar(childId: string, opts?: { start?: string; end?: string }): Promise<ExamEntry[]> {
    const params = new URLSearchParams({ printable: '' });
    if (opts?.start) params.set('start', opts.start);
    if (opts?.end) params.set('end', opts.end);
    const url = new URL(`!${childId}/exams/calendar?${params.toString()}`, this.baseUrl).toString();
    const res = await this.client.get(url, {
      headers: { 'User-Agent': WilmaHttpClient.userAgent() }
    });
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return ExamsClient.parseExamsFromHtml(html);
  }

  /** Parse exam entries — supports both legacy (table.proptable) and modern (div.table-responsive) Wilma HTML */
  static parseExamsFromHtml(html: string): ExamEntry[] {
    const $ = cheerio.load(html);
    const fetchedAt = new Date();

    // Modern Wilma: div.table-responsive.margin-bottom > table.table-grey
    const modernBlocks = $('div.table-responsive.margin-bottom');
    if (modernBlocks.length > 0) {
      return ExamsClient._parseModernHtml($, modernBlocks, fetchedAt);
    }

    // Legacy Wilma: table.proptable
    return ExamsClient._parseLegacyHtml($, fetchedAt);
  }

  private static _parseModernHtml($: cheerio.CheerioAPI, blocks: cheerio.Cheerio<any>, fetchedAt: Date): ExamEntry[] {
    const exams: ExamEntry[] = [];
    let autoId = 1;

    blocks.each((_: number, block: any) => {
      const table = $(block).find('table.table-grey').first();
      if (!table.length) return;

      const rows = table.find('tr');
      if (!rows.length) return;

      const firstCells = $(rows.get(0)).find('td');
      if (firstCells.length < 2) return;

      const dateText = $(firstCells.get(0)).text().trim();
      const match = /(\d{1,2}\.\d{1,2}\.\d{4})/.exec(dateText);
      if (!match) return;

      const [d, m, y] = match[1].split('.').map(Number);
      const dateIso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const subjDesc = compactText($(firstCells.get(1)).text());
      let subject = subjDesc;
      let description: string | null = null;
      if (subjDesc.includes(':')) {
        const parts = subjDesc.split(':');
        description = parts[0].trim();
        subject = parts.slice(1).join(':').trim();
      }

      let teacher: string | null = null;
      const teachers: string[] = [];
      let notes: string | null = null;

      rows.slice(1).each((_: number, row: any) => {
        const th = $(row).find('th').first();
        const td = $(row).find('td').first();
        if (!th.length || !td.length) return;

        const header = th.text().trim().toLowerCase();
        const value = td.text().trim();

        if (header.includes('opettaja') || header.includes('teacher')) {
          const names = td.find('a.profile-link').toArray()
            .map((a: any) => $(a).text().trim())
            .filter(Boolean);
          teacher = names.length ? names.join(', ') : value;
          teachers.push(...(names.length ? names : value.split(',').map((s: string) => s.trim()).filter(Boolean)));
        } else if (header.includes('lisätiedot') || header.includes('lisatiedot') || header.includes('notes') || header.includes('info')) {
          notes = value || null;
        }
      });

      exams.push({
        wilmaId: autoId++,
        date: match[1],
        dateIso,
        subject: compactText(subject || '(N/A)'),
        description: description ? compactText(description) : null,
        teacher: teacher ? compactText(teacher) : null,
        teachers,
        summary: compactText(subject || '(N/A)'),
        notes,
        fetchedAt
      });
    });

    return exams;
  }

  private static _parseLegacyHtml($: cheerio.CheerioAPI, fetchedAt: Date): ExamEntry[] {
    const exams: ExamEntry[] = [];
    let autoId = 1;
    let currentDate: string | null = null;
    let currentTeachers: string[] = [];
    let currentSummary: string | null = null;

    $('table.proptable tr').each((_index: number, row: any) => {
      const $row = $(row);
      const firstCol = $row.find('th, td').eq(0);
      const secondCol = $row.find('th, td').eq(1);

      const firstText = firstCol.text().trim();
      const secondText = secondCol.text().trim();

      const tagName = (firstCol.prop('tagName') || '').toString().toUpperCase();
      if (tagName === 'TH' && firstText.match(/^\w{2}\s+\d+\.\d+\.\d+/)) {
        currentDate = firstText;
        currentTeachers = [];
        currentSummary = secondText || null;
      } else if (firstText === 'Opettaja:' || firstText === 'Teacher:') {
        currentTeachers = secondText.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      } else if (
        firstText === 'Tiedot:' ||
        firstText === 'Info:' ||
        firstText === 'Details:' ||
        firstText.toLowerCase().includes('lisätiedot') ||
        firstText.toLowerCase().includes('lisatiedot')
      ) {
        if (currentDate) {
          const dateIso = ExamsClient.convertFinnishDateToISO(currentDate);
          if (dateIso) {
            exams.push({
              wilmaId: autoId++,
              date: currentDate,
              dateIso,
              subject: currentSummary || firstText,
              description: secondText || null,
              teacher: currentTeachers.length > 0 ? currentTeachers[0] : null,
              teachers: currentTeachers,
              summary: currentSummary || firstText,
              notes: null,
              fetchedAt
            });
          }
        }
      }
    });

    return exams;
  }

  /** Convert Finnish date format to ISO 8601 */
  static convertFinnishDateToISO(finnishDate: string): string {
    if (!finnishDate) return '';

    const formats = ['EEE d.M.yyyy', 'd.M.yyyy'];
    let parsed: Date | null = null;
    for (const fmt of formats) {
      const candidate = parse(finnishDate, fmt, new Date(), { locale: fi });
      if (!isNaN(candidate.getTime())) {
        parsed = candidate;
        break;
      }
    }

    if (!parsed) return '';

    const utcNoon = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0));
    return utcNoon.toISOString();
  }

  /** Filter exams to only future ones (relative to today) */
  static filterFutureExams(exams: ExamEntry[]): ExamEntry[] {
    const today = startOfDay(new Date());

    return exams.filter((exam) => {
      const examDate = startOfDay(new Date(exam.dateIso));
      return isAfter(examDate, today) || isEqual(examDate, today);
    });
  }
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
