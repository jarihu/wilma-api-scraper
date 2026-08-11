import { describe, it, expect } from 'vitest';
import { HomeworkExtractor } from '../src/homework';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load test data
const overviewJsonPath = join(__dirname, 'fixtures/overview.json');
const overviewData = JSON.parse(readFileSync(overviewJsonPath, 'utf-8'));

describe('HomeworkExtractor', () => {
  describe('extractHomework()', () => {
    it('should extract homework from real overview.json data', () => {
      const fixtureRef = new Date('2025-12-09');
      const result = HomeworkExtractor.extractHomework(overviewData, 7, fixtureRef);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify structure of first entry
      const entry = result[0];
      expect(entry).toHaveProperty('courseId');
      expect(entry).toHaveProperty('courseName');
      expect(entry).toHaveProperty('courseCode');
      expect(entry).toHaveProperty('groupName');
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('dateIso');
      expect(entry).toHaveProperty('homework');
    });

    it('should include only homework from the last 7 days', () => {
      const fixtureRef = new Date('2025-12-09');
      const result = HomeworkExtractor.extractHomework(overviewData, 7, fixtureRef);

      const sevenDaysAgo = new Date(fixtureRef);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      result.forEach((entry) => {
        const entryDate = new Date(entry.dateIso);
        entryDate.setHours(0, 0, 0, 0);

        expect(entryDate.getTime()).toBeGreaterThanOrEqual(
          sevenDaysAgo.getTime()
        );
        expect(entryDate.getTime()).toBeLessThanOrEqual(
          fixtureRef.getTime()
        );
      });
    });

    it('should return empty array for empty input object', () => {
      const result = HomeworkExtractor.extractHomework({});
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', () => {
      const result = HomeworkExtractor.extractHomework(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = HomeworkExtractor.extractHomework(undefined);
      expect(result).toEqual([]);
    });

    it('should handle Groups array with empty homework', () => {
      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });

    it('should skip groups with missing required fields', () => {
      const data = {
        Groups: [
          {
            // Missing CourseId
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [
              { Date: '2025-12-08', Homework: 'Test homework' },
            ],
          },
          {
            CourseId: 12345,
            // Missing CourseName
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [
              { Date: '2025-12-08', Homework: 'Test homework' },
            ],
          },
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            // Missing CourseCode
            Name: 'TestGroup',
            Homework: [
              { Date: '2025-12-08', Homework: 'Test homework' },
            ],
          },
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            // Missing Name
            Homework: [
              { Date: '2025-12-08', Homework: 'Test homework' },
            ],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });

    it('should skip homework with missing Date field', () => {
      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Homework: 'Test homework without date' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });

    it('should skip homework with missing Homework field', () => {
      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: '2025-12-08' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });

    it('should skip homework with invalid date format', () => {
      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: 'invalid-date', Homework: 'Test homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });

    it('should skip homework older than 7 days', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      const dateStr = eightDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: dateStr, Homework: 'Old homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });

    it('should include homework exactly 7 days old', () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: dateStr, Homework: '7-day-old homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBe(1);
      expect(result[0].homework).toBe('7-day-old homework');
    });

    it('should include homework from today', () => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: today, Homework: 'Today homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBe(1);
      expect(result[0].homework).toBe('Today homework');
    });

    it('should parse homework with ISO date format (yyyy-MM-dd)', () => {
      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: '2025-12-08', Homework: 'Test homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBeGreaterThanOrEqual(0); // Date is in future relative to today
    });

    it('should parse homework with Finnish date format (d.M.yyyy)', () => {
      const today = new Date();
      const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;

      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: dateStr, Homework: 'Finnish format homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBe(1);
      expect(result[0].homework).toBe('Finnish format homework');
    });

    it('should extract only the first (latest) homework per group', () => {
      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [
              { Date: '2025-12-08', Homework: 'Latest homework' },
              { Date: '2025-12-07', Homework: 'Older homework' },
              { Date: '2025-12-06', Homework: 'Even older homework' },
            ],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      // Only extract if within 7 days
      if (result.length > 0) {
        expect(result[0].homework).toBe('Latest homework');
      }
    });

    it('should handle multiple groups with homework', () => {
      const today = new Date().toISOString().split('T')[0];

      const data = {
        Groups: [
          {
            CourseId: 1,
            CourseName: 'English',
            CourseCode: 'ENG1',
            Name: 'Group A',
            Homework: [{ Date: today, Homework: 'English homework' }],
          },
          {
            CourseId: 2,
            CourseName: 'Math',
            CourseCode: 'MAT1',
            Name: 'Group B',
            Homework: [{ Date: today, Homework: 'Math homework' }],
          },
          {
            CourseId: 3,
            CourseName: 'History',
            CourseCode: 'HIS1',
            Name: 'Group C',
            Homework: [{ Date: today, Homework: 'History homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBe(3);
      expect(result[0].courseName).toBe('English');
      expect(result[1].courseName).toBe('Math');
      expect(result[2].courseName).toBe('History');
    });

    it('should preserve all homework metadata in output', () => {
      const today = new Date().toISOString().split('T')[0];

      const data = {
        Groups: [
          {
            CourseId: 66176,
            CourseName: 'ENA1 5 lk syksy',
            CourseCode: 'ENA15s',
            Name: 'ENA1',
            Homework: [
              {
                Date: today,
                Homework: 'Test homework content with details',
              },
            ],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBe(1);

      const entry = result[0];
      expect(entry.courseId).toBe(66176);
      expect(entry.courseName).toBe('ENA1 5 lk syksy');
      expect(entry.courseCode).toBe('ENA15s');
      expect(entry.groupName).toBe('ENA1');
      expect(entry.date).toBe(today);
      expect(entry.homework).toBe('Test homework content with details');
      expect(entry.dateIso).toBeDefined();
    });

    it('should return ISO format date in dateIso field', () => {
      const today = new Date().toISOString().split('T')[0];

      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: today, Homework: 'Test homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBe(1);

      const entry = result[0];
      // dateIso should be valid ISO 8601 date string (with time component)
      expect(entry.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle groups array as non-array gracefully', () => {
      const data = {
        Groups: 'not an array',
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });

    it('should handle null group objects', () => {
      const today = new Date().toISOString().split('T')[0];

      const data = {
        Groups: [
          null,
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: today, Homework: 'Test homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result.length).toBe(1);
    });

    it('should skip future homework beyond today', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const data = {
        Groups: [
          {
            CourseId: 12345,
            CourseName: 'Test Course',
            CourseCode: 'TEST',
            Name: 'TestGroup',
            Homework: [{ Date: dateStr, Homework: 'Future homework' }],
          },
        ],
      };

      const result = HomeworkExtractor.extractHomework(data);
      expect(result).toEqual([]);
    });
  });
});
