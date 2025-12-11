import { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { parse, startOfDay, isAfter, isEqual } from 'date-fns';
import { fi } from 'date-fns/locale';
import { WilmaHttpClient } from './http.js';

/**
 * Parsed exam entry with dates and details
 */
export interface ExamEntry {
  date: string;
  dateIso: string;
  subject: string;
  teachers: string[];
  summary: string;
  description: string | null;
}

/**
 * Exams client for fetching and parsing exam calendars
 */
export class ExamsClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(client: AxiosInstance, baseUrl: string) {
    this.client = client;
    this.baseUrl = baseUrl;
  }

  /** Fetch and parse exam calendar for a child */
  async fetchCalendar(childId: string): Promise<ExamEntry[]> {
    const url = `${this.baseUrl}/!${childId}/exams/calendar?printable`;
    const res = await this.client.get(url, {
      headers: { 'User-Agent': WilmaHttpClient.userAgent() }
    });
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return ExamsClient.parseExamsFromHtml(html);
  }

  /** Parse exam entries from HTML table structure */
  static parseExamsFromHtml(html: string): ExamEntry[] {
    const $ = cheerio.load(html);
    const exams: ExamEntry[] = [];

    const rows = $('table.proptable tr');
    let currentDate: string | null = null;
    let currentTeachers: string[] = [];
    let currentSummary: string | null = null;

    rows.each((_index: number, row: any) => {
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
        const teacherText = secondText;
        currentTeachers = teacherText.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
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
              date: currentDate,
              dateIso,
              subject: currentSummary || firstText,
              teachers: currentTeachers,
              summary: currentSummary || firstText,
              description: secondText || null
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
