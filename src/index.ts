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
} from './errors';

// HTTP utilities
export { WilmaHttpClient, createWilmaClient, userAgent } from './http';

// Authentication
export { WilmaAuthClient } from './auth';
export type { WilmaAuthConfig, ChildWithSchool, ChildEntry, SchoolAndClass } from './auth';

// Parser - child entries
export { ChildParser } from './parser';

// Exams
export { ExamsClient } from './exams';
export type { ExamEntry } from './exams';

// Overview
export { OverviewParser, OverviewClient } from './overview';
export type { 
  Overview, 
  OverviewExam, 
  OverviewGroup,
  ScheduleEntry,
  HomeworkEntry as OverviewHomeworkEntry,
  DiaryEntry,
  Teacher
} from './overview';

// Messages
export { MessagesClient } from './messages';
export { MessageDetailService } from './messages_detail_helper';
export type { MessageListItem } from './messages';
export type { MessageDetail } from './messages_detail_helper';

// Homework
export { HomeworkExtractor } from './homework';
export type { HomeworkEntry } from './homework';

// Re-export types from axios
export type { AxiosInstance, AxiosResponse } from 'axios';
