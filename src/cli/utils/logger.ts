/**
 * Logger utilities
 */

import chalk from 'chalk';

/**
 * Log types
 */
export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

/**
 * Logger class
 */
export class Logger {
  private debugMode: boolean;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  /**
   * Log info message
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log success message
   */
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Log warning message
   */
  warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Log error message
   */
  error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  /**
   * Log debug message (only in debug mode)
   */
  debug(message: string): void {
    if (this.debugMode) {
      console.log(chalk.gray('⋯'), chalk.gray(message));
    }
  }

  /**
   * Log title
   */
  title(message: string): void {
    console.log(chalk.bold.cyan('\n' + message));
    console.log(chalk.cyan('─'.repeat(message.length)));
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

export default logger;
