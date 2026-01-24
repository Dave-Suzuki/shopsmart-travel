/**
 * On-screen debug logger for mobile debugging
 */

export interface LogEntry {
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 50;
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && window.location.search.includes('debug=auth')) {
      this.interceptConsole();
    }
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      const message = args[0];
      if (typeof message === 'string' && message.includes('[AUTH')) {
        this.addLog('log', message, args[1]);
      }
    };

    console.warn = (...args) => {
      originalWarn(...args);
      const message = args[0];
      if (typeof message === 'string' && message.includes('[AUTH')) {
        this.addLog('warn', message, args[1]);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      const message = args[0];
      if (typeof message === 'string' && message.includes('[AUTH')) {
        this.addLog('error', message, args[1]);
      }
    };
  }

  private addLog(level: 'log' | 'warn' | 'error', message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current logs
    listener([...this.logs]);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }
}

export const debugLogger = new DebugLogger();
