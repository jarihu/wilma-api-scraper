/**
 * Wilma API - Pure TypeScript library for Wilma school information system
 */

// Error classes
export {
  WilmaError,
  WilmaAuthError,
  WilmaNetworkError,
  WilmaParseError,
  WilmaValidationError,
  WilmaSessionError,
  WilmaApiVersionError,
  isWilmaError,
  isWilmaAuthError,
  isWilmaNetworkError,
  isWilmaParseError,
  isWilmaSessionError,
  isWilmaValidationError
} from './errors.js';

// HTTP utilities
export { WilmaHttpClient, createWilmaClient, userAgent } from './http.js';

// Authentication
export { WilmaAuthClient } from './auth.js';
export type { WilmaAuthConfig, ChildWithSchool, ChildEntry, SchoolAndClass } from './auth.js';

// Parser - child entries
export { ChildParser } from './parser.js';

// Exams
export { ExamsClient } from './exams.js';
export type { ExamEntry } from './exams.js';

// Overview
export { OverviewParser, OverviewClient } from './overview.js';
export type { 
  Overview, 
  OverviewExam, 
  OverviewGroup,
  ScheduleEntry,
  HomeworkEntry as OverviewHomeworkEntry,
  DiaryEntry,
  Teacher,
  UpcomingExam,
  GradeEntry
} from './overview.js';

// Messages
export { MessagesClient } from './messages.js';
export { MessageDetailService } from './messages_detail_helper.js';
export type { MessageListItem } from './messages.js';
export type { MessageDetail } from './messages_detail_helper.js';

// Homework
export { HomeworkExtractor } from './homework.js';
export type { HomeworkEntry } from './homework.js';

// Re-export types from axios
export type { AxiosInstance, AxiosResponse } from 'axios';
