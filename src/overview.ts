import { parse } from 'date-fns';
import { fi } from 'date-fns/locale';
import { AxiosInstance } from 'axios';
import { WilmaHttpClient } from './http.js';

/**
 * Teacher information
 */
export interface Teacher {
  id?: number;
  name: string;
  code: string;
}

/**
 * Homework entry
 */
export interface HomeworkEntry {
  rowNumber: number;
  date: string;
  homework: string;
}

/**
 * Diary (lesson notes) entry
 */
export interface DiaryEntry {
  rowNumber: number;
  date: string;
  lesson: string;
  note: string;
  teacher: Teacher;
}

/**
 * Overview exam entry from JSON
 */
export interface OverviewExam {
  date: string;
  dateIso: string;
  subject: string;
  teachers: string[];
  summary: string;
  description: string | null;
}

/**
 * Schedule entry (timetable slot)
 */
export interface ScheduleEntry {
  scheduleId: number;
  day: number;
  start: string;
  end: string;
  class: string;
  dateArray: string[];
  groups: Array<{
    id: number;
    shortCaption: string;
    caption: string;
    fullCaption: string;
    teachers: Teacher[];
  }>;
}

/**
 * Course/Group information with homework, diary, and exams
 */
export interface OverviewGroup {
  id: number;
  courseId: number;
  name: string;
  caption: string;
  courseName: string;
  courseCode: string;
  startDate: string;
  endDate: string;
  teachers: Teacher[];
  homework: HomeworkEntry[];
  diary: DiaryEntry[];
  exams: OverviewExam[];
}

/**
 * Complete overview response structure
 */
export interface Overview {
  role: string;
  schedule: ScheduleEntry[];
  groups: OverviewGroup[];
}

/**
 * Parser for overview responses
 */
export class OverviewParser {
  /** Parse overview JSON response from Wilma */
  static parseOverviewJson(responseData: unknown, _childId: string): Overview {
    const raw = responseData as any;

    return {
      role: raw.Role || 'unknown',
      schedule: Array.isArray(raw.Schedule)
        ? raw.Schedule.map((entry: any) => ({
            scheduleId: entry.ScheduleID || 0,
            day: entry.Day || 0,
            start: entry.Start || '',
            end: entry.End || '',
            class: entry.Class || '',
            dateArray: Array.isArray(entry.DateArray) ? entry.DateArray : [],
            groups: Array.isArray(entry.Groups)
              ? entry.Groups.map((g: any) => ({
                  id: g.Id || 0,
                  shortCaption: g.ShortCaption || '',
                  caption: g.Caption || '',
                  fullCaption: g.FullCaption || '',
                  teachers: Array.isArray(g.Teachers)
                    ? g.Teachers.map((t: any) => ({
                        id: t.Id,
                        name: t.LongCaption || t.Caption || '',
                        code: t.Caption || ''
                      }))
                    : []
                }))
              : []
          }))
        : [],
      groups: Array.isArray(raw.Groups)
        ? raw.Groups.map((group: any) => ({
            id: group.Id || 0,
            courseId: group.CourseId || 0,
            name: group.Name || '',
            caption: group.Caption || '',
            courseName: group.CourseName || '',
            courseCode: group.CourseCode || '',
            startDate: group.StartDate || '',
            endDate: group.EndDate || '',
            teachers: Array.isArray(group.Teachers)
              ? group.Teachers.map((t: any) => ({
                  id: t.TeacherId,
                  name: t.TeacherName || '',
                  code: t.TeacherCode || ''
                }))
              : [],
            homework: Array.isArray(group.Homework)
              ? group.Homework.map((h: any) => ({
                  rowNumber: h.RowNumber || 0,
                  date: h.Date || '',
                  homework: h.Homework || ''
                }))
              : [],
            diary: Array.isArray(group.Diary)
              ? group.Diary.map((d: any) => ({
                  rowNumber: d.RowNumber || 0,
                  date: d.Date || '',
                  lesson: d.Lesson || '',
                  note: d.Note || '',
                  teacher: {
                    id: d.TeacherId,
                    name: d.TeacherName || '',
                    code: d.TeacherCode || ''
                  }
                }))
              : [],
            exams: Array.isArray(group.Exams)
              ? group.Exams.map((e: any) => ({
                  date: e.Date || '',
                  dateIso: OverviewParser.convertFinnishDateToISO(e.Date),
                  subject: e.Name || e.Course || '',
                  teachers: Array.isArray(e.Teachers)
                    ? e.Teachers.map((t: any) => t.TeacherCode || t.TeacherName || '')
                    : [],
                  summary: e.Name || e.Course || '',
                  description: e.Info || null
                }))
              : []
          }))
        : []
    };
  }

  /** Convert Finnish date format to ISO 8601 */
  static convertFinnishDateToISO(finnishDate: string): string {
    if (!finnishDate) return '';

    const formats = ['d.M.yyyy', 'EEE d.M.yyyy'];
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
}

/**
 * Overview client for fetching overview data from Wilma
 */
export class OverviewClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(client: AxiosInstance, baseUrl: string) {
    this.client = client;
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch overview JSON data for a child
   * @param childId - The child ID to fetch overview for
   * @param date - Optional date in format d.M.yyyy (defaults to current date)
   * @param getFullMonth - Whether to get full month data (defaults to true)
   * @returns Promise resolving to the parsed Overview object
   */
  async fetchOverview(childId: string, date?: string, getFullMonth: boolean = true): Promise<Overview> {
    const url = `${this.baseUrl}/!${childId}/overview`;
    
    // First, fetch the child's home page to get the formkey
    const homeUrl = `${this.baseUrl}/!${childId}/`;
    const pageRes = await this.client.get(homeUrl, {
      headers: { 'User-Agent': WilmaHttpClient.userAgent() }
    });
    
    // Extract formkey from the HTML page
    const formkey = this.extractFormKey(pageRes.data, childId);
    if (!formkey) {
      throw new Error('Failed to extract formkey from child home page');
    }
    
    // Use current date if not provided
    const targetDate = date || new Date().toLocaleDateString('fi-FI');
    
    // Make POST request with formkey
    const params = new URLSearchParams({
      date: targetDate,
      getfullmonth: String(getFullMonth),
      formkey: formkey
    });
    
    const res = await this.client.post(url, params.toString(), {
      headers: {
        'User-Agent': WilmaHttpClient.userAgent(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return OverviewParser.parseOverviewJson(res.data, childId);
  }

  /**
   * Fetch raw overview JSON data for a child without parsing
   * @param childId - The child ID to fetch overview for
   * @param date - Optional date in format d.M.yyyy (defaults to current date)
   * @param getFullMonth - Whether to get full month data (defaults to true)
   * @returns Promise resolving to the raw response data
   */
  async fetchOverviewRaw(childId: string, date?: string, getFullMonth: boolean = true): Promise<unknown> {
    const url = `${this.baseUrl}/!${childId}/overview`;
    
    // First, fetch the child's home page to get the formkey
    const homeUrl = `${this.baseUrl}/!${childId}/`;
    const pageRes = await this.client.get(homeUrl, {
      headers: { 'User-Agent': WilmaHttpClient.userAgent() }
    });
    
    // Extract formkey from the HTML page
    const formkey = this.extractFormKey(pageRes.data, childId);
    
    if (!formkey) {
      throw new Error('Failed to extract formkey from child home page');
    }
    
    // Use current date if not provided
    const targetDate = date || new Date().toLocaleDateString('fi-FI');
    
    // Make POST request with formkey
    const params = new URLSearchParams({
      date: targetDate,
      getfullmonth: String(getFullMonth),
      formkey: formkey
    });
    
    const res = await this.client.post(url, params.toString(), {
      headers: {
        'User-Agent': WilmaHttpClient.userAgent(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return res.data;
  }

  /**
   * Extract formkey from overview HTML page
   * @param html - HTML content of the overview page (string or already parsed)
   * @param childId - The child ID
   * @returns The extracted formkey or null if not found
   */
  private extractFormKey(html: any, childId: string): string | null {
    // Convert to string if it's an object
    const htmlString = typeof html === 'string' ? html : JSON.stringify(html);
    
    // Look for formkey in the HTML - it's typically in a hidden input or data attribute
    const patterns = [
      /<input[^>]+name=["']formkey["'][^>]+value=["']([^"']+)["']/i,
      /<input[^>]+value=["']([^"']+)["'][^>]+name=["']formkey["']/i,
      /data-formkey=["']([^"']+)["']/i,
      /"formkey"\s*:\s*"([^"]+)"/i,
      /formkey=([a-zA-Z0-9:%._+\-]+)(?:&|$|\s)/i
    ];
    
    for (const pattern of patterns) {
      const match = htmlString.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
}

