import { parse, startOfDay, subDays, isBefore, isAfter, isEqual } from 'date-fns';
import { fi } from 'date-fns/locale';

export interface HomeworkEntry {
  courseId: number;
  courseName: string;
  courseCode: string;
  groupName: string;
  date: string;
  dateIso: string;
  homework: string;
}

export class HomeworkExtractor {
  /**
   * Extracts homework from Wilma overview JSON response.
   * Processes all groups, extracts the latest homework item per group,
   * filters to entries from the last 7 days, and returns normalized results.
   *
   * @param responseData - Wilma overview API response data
   * @returns Array of HomeworkEntry objects for homework within 7 days
   */
  static extractHomework(responseData: unknown): HomeworkEntry[] {
    const result: HomeworkEntry[] = [];

    // Type guard: ensure responseData is an object with Groups array
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

    // Calculate date range: today and last 7 days
    const today = startOfDay(new Date());
    const sevenDaysAgo = startOfDay(subDays(today, 7));

    // Process each group
    for (const group of data.Groups) {
      // Type guard: ensure group is an object
      if (typeof group !== 'object' || group === null) {
        continue;
      }

      const g = group as {
        CourseId?: unknown;
        CourseName?: unknown;
        CourseCode?: unknown;
        Name?: unknown;
        Homework?: unknown[];
      };

      // Validate required group fields
      if (
        typeof g.CourseId !== 'number' ||
        typeof g.CourseName !== 'string' ||
        typeof g.CourseCode !== 'string' ||
        typeof g.Name !== 'string'
      ) {
        continue;
      }

      // Skip if no homework array or empty
      if (!Array.isArray(g.Homework) || g.Homework.length === 0) {
        continue;
      }

      // Get the first (most recent) homework item
      const latestHw = g.Homework[0];
      if (typeof latestHw !== 'object' || latestHw === null) {
        continue;
      }

      const hw = latestHw as {
        Date?: unknown;
        Homework?: unknown;
      };

      // Validate homework has required fields
      if (
        typeof hw.Date !== 'string' ||
        typeof hw.Homework !== 'string'
      ) {
        continue;
      }

      // Parse the homework date (supports multiple formats)
      const hwDate = this.parseDate(hw.Date);
      if (!hwDate) {
        continue;
      }

      const hwDateStartOfDay = startOfDay(hwDate);

      // Filter: only include homework from last 7 days (inclusive)
      if (
        isBefore(hwDateStartOfDay, sevenDaysAgo) ||
        isAfter(hwDateStartOfDay, today)
      ) {
        continue;
      }

      // Create homework entry
      const entry: HomeworkEntry = {
        courseId: g.CourseId,
        courseName: g.CourseName,
        courseCode: g.CourseCode,
        groupName: g.Name,
        date: hw.Date,
        dateIso: hwDateStartOfDay.toISOString(),
        homework: hw.Homework,
      };

      result.push(entry);
    }

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
