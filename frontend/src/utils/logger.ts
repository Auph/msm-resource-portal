/**
 * Logging Utility
 * 
 * Provides consistent logging with environment-based behavior
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Logger class
 */
class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (!isDevelopment && level === LogLevel.DEBUG) {
      return false;
    }
    return true;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, error, ...args);
      
      // In production, you might want to send errors to a logging service
      // Example: Sentry, LogRocket, etc.
      if (!isDevelopment && error) {
        // Send to error tracking service
        // errorTrackingService.captureException(error);
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;

