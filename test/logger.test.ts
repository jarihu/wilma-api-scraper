import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, setLogLevel } from '../src/logger';

describe('logger', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.setLevel('silent');
  });

  afterEach(() => {
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  describe('setLevel / getLevel', () => {
    it('should default to silent', () => {
      expect(logger.getLevel()).toBe('silent');
    });

    it('should set level to debug', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');
    });

    it('should set level to warn', () => {
      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');
    });

    it('should set level back to silent', () => {
      logger.setLevel('debug');
      logger.setLevel('silent');
      expect(logger.getLevel()).toBe('silent');
    });
  });

  describe('warn', () => {
    it('should not log when level is silent', () => {
      logger.warn('test warning');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should log when level is warn', () => {
      logger.setLevel('warn');
      logger.warn('test warning');
      expect(warnSpy).toHaveBeenCalledWith('[Wilma] test warning');
    });

    it('should log when level is debug', () => {
      logger.setLevel('debug');
      logger.warn('test warning');
      expect(warnSpy).toHaveBeenCalledWith('[Wilma] test warning');
    });
  });

  describe('debug', () => {
    it('should not log when level is silent', () => {
      logger.debug('test debug');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('should not log when level is warn', () => {
      logger.setLevel('warn');
      logger.debug('test debug');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('should log when level is debug', () => {
      logger.setLevel('debug');
      logger.debug('test debug');
      expect(debugSpy).toHaveBeenCalledWith('[Wilma] test debug');
    });
  });

  describe('setLogLevel convenience function', () => {
    it('should set the logger level', () => {
      setLogLevel('debug');
      expect(logger.getLevel()).toBe('debug');
      setLogLevel('silent');
      expect(logger.getLevel()).toBe('silent');
    });
  });
});
