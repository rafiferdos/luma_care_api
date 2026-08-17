import { isAppError } from '@/utils/appError'
import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '../../../prisma/generated/prisma/client'

/* ------------------------------------------------------------------ */
/*  Prisma error → { statusCode, message } normalizer                 */
/*  Handles all common PrismaClientKnownRequestError codes in one     */
/*  place — switch is exhaustive over the codes we care about,        */
/*  everything else falls to the 500 handler below.                   */
/* ------------------------------------------------------------------ */

type NormalizedError = { statusCode: number; message: string }

const normalizePrismaKnownError = (
  err: Prisma.PrismaClientKnownRequestError
): NormalizedError | null => {
  switch (err.code) {
    // ── Unique constraint violation ──────────────────────────────
    case 'P2002': {
      const field =
        (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field'
      return {
        statusCode: 409,
        message: `A record with this ${field} already exists.`
      }
    }

    // ── Record not found ─────────────────────────────────────────
    // P2001: where condition found no record
    // P2015: related record not found
    // P2018: required connected records not found
    // P2025: findUniqueOrThrow / updateOrThrow / deleteOrThrow
    case 'P2001':
    case 'P2015':
    case 'P2018':
    case 'P2025':
      return {
        statusCode: 404,
        message: 'The requested record does not exist.'
      }

    // ── Foreign key constraint violation ────────────────────────
    case 'P2003':
      return {
        statusCode: 409,
        message: 'Operation failed: related record not found.'
      }

    // ── Null / required constraint violation ─────────────────────
    case 'P2011':
      return { statusCode: 400, message: 'A required field is missing.' }

    // ── Value out of range / too long ────────────────────────────
    case 'P2000':
    case 'P2020':
      return {
        statusCode: 400,
        message: 'Provided value is out of the allowed range.'
      }

    // ── Table / column does not exist (likely schema mismatch) ───
    case 'P2021':
    case 'P2022':
      return {
        statusCode: 500,
        message: 'Database schema mismatch. Please contact support.'
      }

    default:
      return null // unknown code → falls through to the 500 handler
  }
}

/* ------------------------------------------------------------------ */
/*  Global error handler — Express 5 compatible.                      */
/*  res.statusCode = X (Node built-in) instead of res.status(X)      */
/*  because Express 5 types res.status as a number property.         */
/* ------------------------------------------------------------------ */

const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ── 1. Known operational AppError ───────────────────────────────
  if (isAppError(err)) {
    res.statusCode = err.statusCode
    res.json({
      success: false,
      message: err.message,
      ...(err.errors !== undefined && { errors: err.errors })
    })
    return
  }

  // ── 2. Prisma known request errors (P-codes) ─────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const normalized = normalizePrismaKnownError(err)
    if (normalized) {
      res.statusCode = normalized.statusCode
      res.json({ success: false, message: normalized.message })
      return
    }
  }

  // ── 3. Prisma validation error (bad query shape) ─────────────────
  //    Happens when a required field is missing in a Prisma call —
  //    always a programmer error, not user input error.
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.statusCode = 400
    res.json({
      success: false,
      message: 'Invalid database query. Please contact support.'
    })
    return
  }

  // ── 4. Prisma DB connection failure ──────────────────────────────
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[DB CONNECTION ERROR]', err)
    res.statusCode = 503
    res.json({
      success: false,
      message: 'Service temporarily unavailable. Please try again later.'
    })
    return
  }

  // ── 5. Everything else — unexpected bug ──────────────────────────
  //    Never expose internals in production.
  //    Swap console.error for winston/pino when ready.
  console.error(`[UNHANDLED ERROR] ${new Date().toISOString()}`, err)

  res.statusCode = 500
  res.json({
    success: false,
    message:
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'Something went wrong. Please try again later.'
  })
}

export default globalErrorHandler
