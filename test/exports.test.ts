/**
 * Export verification tests for wilma-api module.
 * Verify all public API exports are available and have correct signatures.
 */

import { describe, expect, it } from 'vitest';
import {
  createWilmaClient,
  userAgent,
  WilmaHttpClient,
  WilmaAuthClient,
  ChildParser,
  ExamsClient,
  OverviewParser,
  MessagesClient,
  MessageDetailService
} from '../src/index';

describe('wilma-api exports', () => {
  it('exports HTTP utilities', () => {
    expect(typeof createWilmaClient).toBe('function');
    expect(typeof userAgent).toBe('function');
    expect(typeof WilmaHttpClient).toBe('function');
  });

  it('exports Auth class', () => {
    expect(typeof WilmaAuthClient).toBe('function');
  });

  it('exports Parser utilities as class', () => {
    expect(typeof ChildParser.extractChildEntries).toBe('function');
    expect(typeof ChildParser.extractChildSchoolAndClass).toBe('function');
  });

  it('exports Exam client', () => {
    expect(typeof ExamsClient).toBe('function');
    expect(typeof ExamsClient.parseExamsFromHtml).toBe('function');
    expect(typeof ExamsClient.convertFinnishDateToISO).toBe('function');
    expect(typeof ExamsClient.filterFutureExams).toBe('function');
  });

  it('exports Overview parser', () => {
    expect(typeof OverviewParser.parseOverviewJson).toBe('function');
  });

  it('exports Message clients', () => {
    expect(typeof MessagesClient).toBe('function');
    expect(typeof MessageDetailService).toBe('function');
  });

  it('userAgent returns a string', () => {
    const agent = userAgent();
    expect(typeof agent).toBe('string');
    expect(agent.length).toBeGreaterThan(0);
  });

  it('createWilmaClient returns client and jar', () => {
    const { client, jar } = createWilmaClient();
    expect(client).toBeDefined();
    expect(jar).toBeDefined();
  });

  it('convertFinnishDateToISO works correctly', () => {
    const iso = ExamsClient.convertFinnishDateToISO('Ma 1.12.2025');
    expect(iso).toMatch(/2025-12-01T12:00:00\.000Z/);
  });

  it('filterFutureExams returns array', () => {
    const filtered = ExamsClient.filterFutureExams([]);
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('parseExamsFromHtml returns array', () => {
    const exams = ExamsClient.parseExamsFromHtml('<table></table>');
    expect(Array.isArray(exams)).toBe(true);
  });
});
