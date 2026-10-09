import { ILogger, LogLevel } from 'harek-sdk';
import { EventBus } from './EventBus.js';

export interface LogEntry {
  scope: string;
  level: LogLevel;
  message: string;
  args: unknown[];
  timestamp: number;
}

export class Logger implements ILogger {
  private scope: string;
  private eventBus: EventBus;
  private static logs: LogEntry[] = [];
  private static maxLogs = 200;

  constructor(scope: string, eventBus: EventBus) {
    this.scope = scope;
    this.eventBus = eventBus;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, args);
  }

  static getHistory(): ReadonlyArray<LogEntry> {
    return Logger.logs;
  }

  static clear(): void {
    Logger.logs = [];
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    const entry: LogEntry = {
      scope: this.scope,
      level,
      message,
      args,
      timestamp: Date.now()
    };
    Logger.logs.push(entry);
    if (Logger.logs.length > Logger.maxLogs) {
      Logger.logs.shift();
    }

    const prefix = `[${new Date(entry.timestamp).toLocaleTimeString()}] [${this.scope}] [${level.toUpperCase()}]:`;
    if (level === 'error') {
      console.error(prefix, message, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, message, ...args);
    } else {
      console.log(prefix, message, ...args);
    }

    this.eventBus.emit('kernel:log', entry);
  }
}
