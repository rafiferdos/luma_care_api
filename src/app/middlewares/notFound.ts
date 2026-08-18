import type { NextFunction, Request, Response } from 'express'
import status from 'http-status'

import { AppError } from '../../utils/appError'

/* ------------------------------------------------------------------ */
/*  404 Not Found middleware                                          */
/*                                                                    */
/*  REQUIRED order in app.ts — wrong order = HTML error responses:    */
/*                                                                    */
/*    app.use('/api', routes)                                         */
/*    app.use(notFound)         ← must be BEFORE globalErrorHandler   */
/*    app.use(globalErrorHandler)                                     */
/*                                                                    */
/*  We call next(AppError) — never res.json() — so globalError        */
/*  Handler owns the response: logging, formatting, Prisma errors     */
/*  all stay in one place.                                            */
/* ------------------------------------------------------------------ */

const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const method = req.method
  const url = encodeURI(req.originalUrl)

  // Development: expose method + url for fast debugging.
  // Production: keep it generic — don't leak route structure.
  const message =
    process.env.NODE_ENV === 'production'
      ? 'The requested resource was not found.'
      : `${method} ${url} — route not found`

  next(
    new AppError(status.NOT_FOUND, message, {
      // Attach structured details for internal logging — never
      // reaches the client, only visible in globalErrorHandler logs.
      errors: { method, url, ip: req.ip }
    })
  )
}

export default notFound
