import log from 'electron-log'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export function setupLogger(): void {
  log.transports.file.level = 'info'
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (context) {
    log[level](message, context)
    return
  }
  log[level](message)
}

export const appLogger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
  getFilePath: (): string => log.transports.file.getFile().path
}
