/**
 * Logger utility for consistent, structured logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  context: string
  message: string
  data?: unknown
}

// Set to true in development, false in production
const IS_DEV = import.meta.env.DEV ?? true

// Minimum log level to display
const MIN_LEVEL: LogLevel = IS_DEV ? 'debug' : 'info'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #6b7280; font-weight: normal;',
  info: 'color: #3b82f6; font-weight: normal;',
  warn: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
}

const CONTEXT_STYLE = 'color: #8b5cf6; font-weight: bold;'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    context,
    message,
    data,
  }

  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`
  const contextTag = `[${context}]`

  if (data !== undefined) {
    console.groupCollapsed(
      `%c${prefix} %c${contextTag} %c${message}`,
      LEVEL_STYLES[level],
      CONTEXT_STYLE,
      LEVEL_STYLES[level]
    )
    console.log('Data:', data)
    console.groupEnd()
  } else {
    console.log(
      `%c${prefix} %c${contextTag} %c${message}`,
      LEVEL_STYLES[level],
      CONTEXT_STYLE,
      LEVEL_STYLES[level]
    )
  }
}

/**
 * Creates a logger instance for a specific context (component/service)
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => log('debug', context, message, data),
    info: (message: string, data?: unknown) => log('info', context, message, data),
    warn: (message: string, data?: unknown) => log('warn', context, message, data),
    error: (message: string, data?: unknown) => log('error', context, message, data),
  }
}

export type Logger = ReturnType<typeof createLogger>

export default createLogger
