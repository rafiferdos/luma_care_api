import { HTTPException } from 'hono/http-exception'
import type {
  ClientErrorStatusCode,
  ServerErrorStatusCode
} from 'hono/utils/http-status'

export type AppErrorStatus = ClientErrorStatusCode | ServerErrorStatusCode

type AppErrorOptions = Readonly<{
  errors?: unknown
  cause?: unknown
}>

export class AppError extends HTTPException {
  readonly isOperational = true as const
  readonly errors?: unknown

  constructor(
    status: AppErrorStatus,
    message: string,
    options: AppErrorOptions = {}
  ) {
    super(status, {
      message,
      cause: options.cause
    })

    this.name = 'AppError'
    this.errors = options.errors
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError
