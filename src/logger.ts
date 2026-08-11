type LogLevel = 'silent' | 'warn' | 'debug';

let currentLevel: LogLevel = 'silent';

export const logger = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  getLevel(): LogLevel {
    return currentLevel;
  },

  warn(message: string, ...args: unknown[]): void {
    if (currentLevel === 'silent') return;
    console.warn(`[Wilma] ${message}`, ...args);
  },

  debug(message: string, ...args: unknown[]): void {
    if (currentLevel !== 'debug') return;
    console.log(`[Wilma] ${message}`, ...args);
  },

  log(message: string, ...args: unknown[]): void {
    if (currentLevel !== 'debug') return;
    console.log(`[Wilma] ${message}`, ...args);
  }
};

export function setLogLevel(level: LogLevel): void {
  logger.setLevel(level);
}
