type TAppErrorOptions = {
  // Structured error details — e.g. Prisma field conflicts, custom issues.
  // `unknown` so callers never need to cast; handler decides serialization.
  errors?: unknown

  // Original cause for internal logging (full stack chain), never exposed
  // to the client. Mirrors the native Error options.cause pattern.
  cause?: unknown
}

export class AppError extends Error {
  readonly statusCode: number
  readonly isOperational: true = true
  readonly errors?: unknown

  constructor(
    statusCode: number,
    message: string,
    options: TAppErrorOptions = {}
  ) {
    super(message, { cause: options.cause })

    this.statusCode = statusCode
    this.errors = options.errors

    // Makes `err.name` show "AppError" instead of "Error" in logs/stack traces.
    // Without this, every log entry looks identical — impossible to grep.
    this.name = this.constructor.name

    // Required when extending built-in classes (Error, Array, Map…) in TS.
    // Without this, `instanceof AppError` silently returns false after
    // transpilation to ES5/ES2015 — the isAppError guard would never match.
    Object.setPrototypeOf(this, new.target.prototype)

    // Remove the AppError constructor frame from the stack trace.
    // The relevant frame is always the throw site, not this constructor.
    Error.captureStackTrace(this, this.constructor)
  }
}

/* ------------------------------------------------------------------ */
/*  Type guard — use this in the global error handler to branch:      */
/*    isAppError(err) → expose statusCode + message + errors safely   */
/*    else            → log internally, send generic 500              */
/* ------------------------------------------------------------------ */

export const isAppError = (err: unknown): err is AppError =>
  err instanceof AppError
