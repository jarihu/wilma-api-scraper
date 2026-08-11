import { parse } from 'date-fns';
import { fi } from 'date-fns/locale';
import { AxiosInstance } from 'axios';
import { URL } from 'url';
import { WilmaHttpClient, formatError } from './http.js';
import { WilmaParseError } from './errors.js';
import { logger } from './logger.js';

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
  subject: string;
  subjectCode: string;
  teacher: Teacher;
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
  examId: number;
  date: string;
  dateIso: string;
  subject: string;
  subjectCode: string;
  teachers: string[];
  summary: string;
  description: string | null;
  name: string;
  topic: string | null;
  grade: string | null;
}

/**
 * Upcoming (ungraded, future) exam — flat list derived from Groups[].Exams[]
 */
export interface UpcomingExam {
  examId: number;
  date: string;
  dateIso: string;
  name: string;
  subject: string;
  subjectCode: string;
  topic: string | null;
  teacher: string;
  teacherCode: string;
}

/**
 * Graded exam from top-level Exams[] array
 */
export interface GradeEntry {
  examId: number;
  date: string;
  dateIso: string;
  name: string;
  subject: string;
  subjectCode: string;
  grade: string;
  info: string | null;
  teacher: string;
  teacherCode: string;
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
  /** Flat list of future, ungraded exams across all groups */
  upcomingExams: UpcomingExam[];
  /** Graded exams from top-level Exams[] */
  grades: GradeEntry[];
  /** All homework entries across all groups, newest first */
  homework: HomeworkEntry[];
}

// Raw JSON types from Wilma overview API (keys match server response)
interface RawTeacher {
  TeacherId?: number;
  TeacherName?: string;
  TeacherCode?: string;
}

interface RawHomework {
  RowNumber?: number;
  Date?: string;
  Homework?: string;
}

interface RawDiary {
  RowNumber?: number;
  Date?: string;
  Lesson?: string;
  Note?: string;
  TeacherId?: number;
  TeacherName?: string;
  TeacherCode?: string;
}

interface RawExam {
  Id?: number;
  Date?: string;
  Caption?: string;
  Name?: string;
  Course?: string;
  Info?: string | null;
  Topic?: string | null;
  Grade?: string | number | null;
  Teachers?: Array<{
    TeacherId?: number;
    TeacherName?: string;
    TeacherCode?: string;
  }>;
}

interface RawGroup {
  Id?: number;
  CourseId?: number;
  Name?: string;
  Caption?: string;
  CourseName?: string;
  CourseCode?: string;
  StartDate?: string;
  EndDate?: string;
  Teachers?: RawTeacher[];
  Homework?: RawHomework[];
  Diary?: RawDiary[];
  Exams?: RawExam[];
}

interface RawGradeEntry {
  ExamId?: number;
  Id?: number;
  Date?: string;
  Name?: string;
  CourseTitle?: string;
  Course?: string;
  Grade?: string;
  Info?: string | null;
  Teachers?: RawTeacher[];
}

interface RawScheduleTeacher {
  Id?: number;
  LongCaption?: string;
  Caption?: string;
}

interface RawScheduleGroup {
  Id?: number;
  ShortCaption?: string;
  Caption?: string;
  FullCaption?: string;
  Teachers?: RawScheduleTeacher[];
}

interface RawScheduleEntry {
  ScheduleID?: number;
  Day?: number;
  Start?: string;
  End?: string;
  Class?: string;
  DateArray?: string[];
  Groups?: RawScheduleGroup[];
}

interface RawOverviewResponse {
  Role?: string;
  Groups?: RawGroup[];
  Exams?: RawGradeEntry[];
  Schedule?: RawScheduleEntry[];
}

/**
 * Parser for overview responses
 */
export class OverviewParser {
  /** Parse overview JSON response from Wilma */
  static parseOverviewJson(responseData: unknown, _childId: string): Overview {
    const raw = responseData as RawOverviewResponse;
    const today = new Date().toISOString().slice(0, 10);

    const groups: OverviewGroup[] = Array.isArray(raw.Groups)
      ? raw.Groups.map((group: RawGroup) => {
          const firstTeacher: Teacher = Array.isArray(group.Teachers) && group.Teachers.length > 0
            ? { id: group.Teachers[0].TeacherId, name: group.Teachers[0].TeacherName || '', code: group.Teachers[0].TeacherCode || '' }
            : { name: '', code: '' };
          return {
            id: group.Id || 0,
            courseId: group.CourseId || 0,
            name: group.Name || '',
            caption: group.Caption || '',
            courseName: group.CourseName || '',
            courseCode: group.CourseCode || '',
            startDate: group.StartDate || '',
            endDate: group.EndDate || '',
            teachers: Array.isArray(group.Teachers)
              ? group.Teachers.map((t: RawTeacher) => ({
                  id: t.TeacherId,
                  name: t.TeacherName || '',
                  code: t.TeacherCode || ''
                }))
              : [],
            homework: Array.isArray(group.Homework)
              ? group.Homework.map((h: RawHomework) => ({
                  rowNumber: h.RowNumber || 0,
                  date: h.Date || '',
                  homework: (h.Homework || '').replace(/\r\n/g, '\n').trim(),
                  subject: group.CourseName || '',
                  subjectCode: group.CourseCode || '',
                  teacher: firstTeacher
                }))
              : [],
            diary: Array.isArray(group.Diary)
              ? group.Diary.map((d: RawDiary) => ({
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
              ? group.Exams.map((e: RawExam) => ({
                  examId: e.Id || 0,
                  date: e.Date || '',
                  dateIso: OverviewParser.convertFinnishDateToISO(e.Date || ''),
                  subject: group.CourseName || e.Name || e.Course || '',
                  subjectCode: group.CourseCode || '',
                  teachers: Array.isArray(e.Teachers)
                    ? e.Teachers.map((t) => t.TeacherCode || t.TeacherName || '')
                    : [],
                  summary: e.Caption || e.Name || e.Course || '',
                  description: e.Info || null,
                  name: e.Caption || e.Name || '',
                  topic: e.Topic?.trim() || null,
                  grade: e.Grade !== null && String(e.Grade).trim() !== '' ? String(e.Grade).trim() : null
                }))
              : []
          };
        })
      : [];

    const upcomingExams: UpcomingExam[] = [];
    for (const group of groups) {
      const firstTeacher = group.teachers[0] ?? { name: '', code: '' };
      for (const exam of group.exams) {
        if (exam.grade !== null) continue;
        const dateStr = exam.dateIso ? exam.dateIso.slice(0, 10) : '';
        if (dateStr && dateStr < today) continue;
        upcomingExams.push({
          examId: exam.examId,
          date: exam.date,
          dateIso: exam.dateIso,
          name: exam.name,
          subject: exam.subject,
          subjectCode: exam.subjectCode,
          topic: exam.topic,
          teacher: firstTeacher.name,
          teacherCode: firstTeacher.code
        });
      }
    }
    upcomingExams.sort((a, b) => a.dateIso.localeCompare(b.dateIso));

    const grades: GradeEntry[] = Array.isArray(raw.Exams)
      ? raw.Exams.flatMap((e: RawGradeEntry) => {
          const grade = String(e.Grade ?? '').trim();
          if (!grade) return [];
          const dateIso = OverviewParser.convertFinnishDateToISO(e.Date || '');
          const teacher = e.Teachers?.[0];
          return [{
            examId: e.ExamId || e.Id || 0,
            date: e.Date || '',
            dateIso,
            name: e.Name || '',
            subject: e.CourseTitle || '',
            subjectCode: (e.Course || '').split(' ')[0],
            grade,
            info: e.Info?.trim() || null,
            teacher: teacher?.TeacherName || '',
            teacherCode: teacher?.TeacherCode || ''
          }];
        })
      : [];
    grades.sort((a, b) => b.dateIso.localeCompare(a.dateIso));

    const homework: HomeworkEntry[] = groups
      .flatMap(g => g.homework)
      .filter(h => h.homework.length > 0);
    homework.sort((a, b) => b.date.localeCompare(a.date));

    return {
      role: raw.Role || 'unknown',
      schedule: Array.isArray(raw.Schedule)
        ? raw.Schedule.map((entry: RawScheduleEntry) => ({
            scheduleId: entry.ScheduleID || 0,
            day: entry.Day || 0,
            start: entry.Start || '',
            end: entry.End || '',
            class: entry.Class || '',
            dateArray: Array.isArray(entry.DateArray) ? entry.DateArray : [],
            groups: Array.isArray(entry.Groups)
              ? entry.Groups.map((g: RawScheduleGroup) => ({
                  id: g.Id || 0,
                  shortCaption: g.ShortCaption || '',
                  caption: g.Caption || '',
                  fullCaption: g.FullCaption || '',
                  teachers: Array.isArray(g.Teachers)
                    ? g.Teachers.map((t: RawScheduleTeacher) => ({
                        id: t.Id,
                        name: t.LongCaption || t.Caption || '',
                        code: t.Caption || ''
                      }))
                    : []
                }))
              : []
          }))
        : [],
      groups,
      upcomingExams,
      grades,
      homework
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
  private baseUrl: URL;

  constructor(client: AxiosInstance, baseUrl: string | URL) {
    this.client = client;
    this.baseUrl = typeof baseUrl === 'string' ? new URL(baseUrl) : baseUrl;
  }

  /**
   * Fetch overview JSON data for a child
   * @param childId - The child ID to fetch overview for
   * @param date - Optional date in format d.M.yyyy (defaults to current date)
   * @param getFullMonth - Whether to get full month data (defaults to true)
   * @returns Promise resolving to the parsed Overview object
   */
  async fetchOverview(childId: string, date?: string, getFullMonth: boolean = true): Promise<Overview> {
    // Try the JSON API endpoint first (overview_json), common on newer Wilma servers
    try {
      const apiUrl = new URL(`/overview_json?child=${childId}`, this.baseUrl).toString();
      const apiRes = await this.client.get(apiUrl, { headers: { 'User-Agent': WilmaHttpClient.userAgent() } });
      if (apiRes && apiRes.data && typeof apiRes.data === 'object') {
        return OverviewParser.parseOverviewJson(apiRes.data, childId);
      }
    } catch (err) {
      logger.warn('Failed to fetch overview via JSON API, falling back to HTML:', formatError(err));
    }

    const url = new URL(`!${childId}/overview`, this.baseUrl).toString();

    // First, fetch the child's home page to get the formkey
    const homeUrl = new URL(`!${childId}/`, this.baseUrl).toString();
    const pageRes = await this.client.get(homeUrl, {
      headers: { 'User-Agent': WilmaHttpClient.userAgent() }
    });
    
    // Extract formkey from the HTML page
    const formkey = this.extractFormKey(pageRes.data, childId);
    if (!formkey) {
      throw new WilmaParseError('Failed to extract formkey from child home page');
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
    // Try the JSON API endpoint first (overview_json)
    try {
      const apiUrl = new URL(`/overview_json?child=${childId}`, this.baseUrl).toString();
      const apiRes = await this.client.get(apiUrl, { headers: { 'User-Agent': WilmaHttpClient.userAgent() } });
      if (apiRes && apiRes.data && typeof apiRes.data === 'object') {
        return apiRes.data;
      }
    } catch (err) {
      logger.warn('Failed to fetch raw overview via JSON API, falling back to HTML:', formatError(err));
    }

    const url = new URL(`!${childId}/overview`, this.baseUrl).toString();

    // First, fetch the child's home page to get the formkey
    const homeUrl = new URL(`!${childId}/`, this.baseUrl).toString();
    const pageRes = await this.client.get(homeUrl, {
      headers: { 'User-Agent': WilmaHttpClient.userAgent() }
    });

    // Extract formkey from the HTML page
    const formkey = this.extractFormKey(pageRes.data, childId);

    if (!formkey) {
      throw new WilmaParseError('Failed to extract formkey from child home page');
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
  private extractFormKey(html: unknown, _childId: string): string | null {
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

