import { HTTPException } from 'hono/http-exception'

import { getStatusMessage, type HttpErrorStatus } from './httpStatus'

type AppErrorOptions = Readonly<{
  errors?: unknown
  cause?: unknown
}>

type MessageOrOptions = string | AppErrorOptions

export class AppError extends HTTPException {
  readonly statusCode: HttpErrorStatus
  readonly isOperational = true as const
  readonly errors?: unknown

  constructor(
    statusCode: HttpErrorStatus,
    messageOrOptions?: MessageOrOptions,
    options: AppErrorOptions = {}
  ) {
    const resolvedOptions =
      typeof messageOrOptions === 'object' ? messageOrOptions : options

    const message =
      typeof messageOrOptions === 'string'
        ? messageOrOptions
        : getStatusMessage(statusCode)

    super(statusCode, {
      message,
      cause: resolvedOptions.cause
    })

    this.statusCode = statusCode
    this.name = 'AppError'
    this.errors = resolvedOptions.errors
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError
