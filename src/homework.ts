import { parse, startOfDay, subDays, isBefore, isAfter } from 'date-fns';
import { fi } from 'date-fns/locale';

export interface HomeworkEntry {
  courseId: number;
  courseName: string;
  courseCode: string;
  groupName: string;
  date: string;
  dateIso: string;
  homework: string;
  subjectCode: string;
  teacher: string;
  teacherCode: string;
}

export class HomeworkExtractor {
  /**
   * Extracts homework from Wilma overview JSON response.
   * Processes all groups, extracts all homework entries per group,
   * filters to entries from the last 7 days, and returns normalized results.
   *
   * @param responseData - Wilma overview API response data
   * @param daysBack - How many days back to include (default 7)
   * @returns Array of HomeworkEntry objects sorted newest first
   */
  static extractHomework(
    responseData: unknown,
    daysBack: number = 7,
    referenceDate?: Date
  ): HomeworkEntry[] {
    const result: HomeworkEntry[] = [];

    if (
      typeof responseData !== 'object' ||
      responseData === null ||
      !('Groups' in responseData)
    ) {
      return result;
    }

    const data = responseData as { Groups?: unknown[] };
    if (!Array.isArray(data.Groups)) {
      return result;
    }

    const today = startOfDay(referenceDate || new Date());
    const cutoffDate = startOfDay(subDays(today, daysBack));

    for (const group of data.Groups) {
      if (typeof group !== 'object' || group === null) {
        continue;
      }

      const g = group as {
        CourseId?: unknown;
        CourseName?: unknown;
        CourseCode?: unknown;
        Name?: unknown;
        Teachers?: unknown[];
        Homework?: unknown[];
      };

      if (
        typeof g.CourseId !== 'number' ||
        typeof g.CourseName !== 'string' ||
        typeof g.CourseCode !== 'string' ||
        typeof g.Name !== 'string'
      ) {
        continue;
      }

      if (!Array.isArray(g.Homework) || g.Homework.length === 0) {
        continue;
      }

      const firstTeacher = Array.isArray(g.Teachers) && g.Teachers.length > 0
        ? g.Teachers[0] as { TeacherName?: string; TeacherCode?: string }
        : null;
      const teacher = firstTeacher?.TeacherName ?? '';
      const teacherCode = firstTeacher?.TeacherCode ?? '';

      for (const item of g.Homework) {
        if (typeof item !== 'object' || item === null) {
          continue;
        }

        const hw = item as { Date?: unknown; Homework?: unknown };

        if (typeof hw.Date !== 'string' || typeof hw.Homework !== 'string') {
          continue;
        }

        const text = hw.Homework.replace(/\r\n/g, '\n').trim();
        if (!text) continue;

        const hwDate = this.parseDate(hw.Date);
        if (!hwDate) {
          continue;
        }

        const hwDateStartOfDay = startOfDay(hwDate);

        if (
          isBefore(hwDateStartOfDay, cutoffDate) ||
          isAfter(hwDateStartOfDay, today)
        ) {
          continue;
        }

        result.push({
          courseId: g.CourseId,
          courseName: g.CourseName,
          courseCode: g.CourseCode,
          groupName: g.Name,
          date: hw.Date,
          dateIso: hwDateStartOfDay.toISOString(),
          homework: text,
          subjectCode: g.CourseCode,
          teacher,
          teacherCode,
        });
      }
    }

    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }

  /**
   * Parses a homework date string in various Finnish date formats.
   * Supports: 'yyyy-MM-dd', 'd.M.yyyy', 'EEE d.M.yyyy'
   *
   * @param dateStr - Date string to parse
   * @returns Parsed Date object, or null if parsing fails
   */
  private static parseDate(dateStr: string): Date | null {
    // Try ISO format first: 'yyyy-MM-dd'
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try Finnish format: 'd.M.yyyy'
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
      const parsed = parse(dateStr, 'd.M.yyyy', new Date());
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try Finnish format with day name: 'EEE d.M.yyyy'
    if (/^[a-zA-Z]{2,3}\s+\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
      const parsed = parse(dateStr, 'EEE d.M.yyyy', new Date(), { locale: fi });
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }
}
