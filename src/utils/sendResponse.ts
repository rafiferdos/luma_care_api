import type { Response } from 'express'

/* -------------------------------------------------------------------------- */
/*                                 STATUS CODES                               */
/* -------------------------------------------------------------------------- */

type SuccessStatusCode = 200 | 201 | 202
type NoContentStatusCode = 204

type ErrorStatusCode =
  | 400
  | 401
  | 403
  | 404
  | 405
  | 409
  | 410
  | 422
  | 429
  | 500
  | 502
  | 503

/* -------------------------------------------------------------------------- */
/*                                    META                                    */
/* -------------------------------------------------------------------------- */

type TMeta = Readonly<{
  page: number
  limit: number
  total: number
  totalPages: number
}>

/* -------------------------------------------------------------------------- */
/*                                  PAYLOADS                                  */
/* -------------------------------------------------------------------------- */

type SuccessResponse<T> = Readonly<{
  statusCode: SuccessStatusCode
  message?: string
  data?: T | null
  meta?: TMeta

  errors?: never
}>

type NoContentResponse = Readonly<{
  statusCode: NoContentStatusCode

  message?: never
  data?: never
  meta?: never
  errors?: never
}>

type ErrorResponse = Readonly<{
  statusCode: ErrorStatusCode

  message: string
  errors?: unknown

  data?: never
  meta?: never
}>

type ResponsePayload<T> = SuccessResponse<T> | NoContentResponse | ErrorResponse

/* -------------------------------------------------------------------------- */
/*                                 OVERLOADS                                  */
/* -------------------------------------------------------------------------- */

function sendResponse<T>(res: Response, payload: SuccessResponse<T>): void

function sendResponse(res: Response, payload: NoContentResponse): void

function sendResponse(res: Response, payload: ErrorResponse): void

/* -------------------------------------------------------------------------- */
/*                              IMPLEMENTATION                                */
/* -------------------------------------------------------------------------- */

function sendResponse<T>(res: Response, payload: ResponsePayload<T>): void {
  if (res.headersSent) {
    throw new Error('sendResponse() called after headers were already sent.')
  }

  switch (payload.statusCode) {
    case 204:
      res.status(204).end()
      return

    case 200:
    case 201:
    case 202:
      res.status(payload.statusCode).json({
        success: true,
        message: payload.message ?? 'Success',
        ...(payload.data !== undefined ? { data: payload.data ?? null } : {}),
        ...(payload.meta !== undefined ? { meta: payload.meta } : {})
      } satisfies {
        success: true
        message: string
        data?: T | null
        meta?: TMeta
      })
      return

    case 400:
    case 401:
    case 403:
    case 404:
    case 405:
    case 409:
    case 410:
    case 422:
    case 429:
    case 500:
    case 502:
    case 503:
      res.status(payload.statusCode).json({
        success: false,
        message: payload.message,
        ...(payload.errors !== undefined ? { errors: payload.errors } : {})
      } satisfies {
        success: false
        message: string
        errors?: unknown
      })
      return
  }
}

export default sendResponse
