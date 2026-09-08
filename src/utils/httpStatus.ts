import { STATUS_CODES } from 'node:http'

import type {
  ClientErrorStatusCode,
  ServerErrorStatusCode,
  SuccessStatusCode
} from 'hono/utils/http-status'
import status from 'http-status'

export type HttpSuccessStatus = SuccessStatusCode

export type HttpErrorStatus = ClientErrorStatusCode | ServerErrorStatusCode

export type HttpStatus = HttpSuccessStatus | HttpErrorStatus

export const {
  OK,
  CREATED,
  ACCEPTED,
  NO_CONTENT,

  BAD_REQUEST,
  UNAUTHORIZED,
  PAYMENT_REQUIRED,
  FORBIDDEN,
  NOT_FOUND,
  METHOD_NOT_ALLOWED,
  CONFLICT,
  GONE,
  UNPROCESSABLE_ENTITY,
  TOO_MANY_REQUESTS,

  INTERNAL_SERVER_ERROR,
  NOT_IMPLEMENTED,
  BAD_GATEWAY,
  SERVICE_UNAVAILABLE,
  GATEWAY_TIMEOUT
} = status

export const getStatusMessage = (statusCode: number): string => {
  return STATUS_CODES[statusCode] ?? 'Request failed'
}

export { status as HTTP_STATUS }
