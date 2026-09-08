import type { ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type {
  ClientErrorStatusCode,
  ServerErrorStatusCode
} from 'hono/utils/http-status'

import { Prisma } from '../../../prisma/generated/prisma/client'
import { isAppError } from '../../utils/appError'
import { sendResponse } from '../../utils/sendResponse'
import config from '../config'

type ErrorStatusCode = ClientErrorStatusCode | ServerErrorStatusCode

type NormalizedError = Readonly<{
  statusCode: ErrorStatusCode
  message: string
}>

const toErrorStatusCode = (statusCode: number): ErrorStatusCode => {
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
    return statusCode as ErrorStatusCode
  }

  return 500
}

const normalizePrismaError = (
  error: Prisma.PrismaClientKnownRequestError
): NormalizedError | null => {
  switch (error.code) {
    case 'P2002': {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[]).join(', ')
        : 'field'

      return {
        statusCode: 409,
        message: `A record with this ${target} already exists.`
      }
    }

    case 'P2001':
    case 'P2015':
    case 'P2018':
    case 'P2025':
      return {
        statusCode: 404,
        message: 'The requested record does not exist.'
      }

    case 'P2003':
    case 'P2004':
    case 'P2014':
    case 'P2017':
      return {
        statusCode: 409,
        message: 'The operation conflicts with existing data.'
      }

    case 'P2000':
    case 'P2005':
    case 'P2006':
    case 'P2007':
    case 'P2011':
    case 'P2012':
    case 'P2013':
    case 'P2019':
    case 'P2020':
      return {
        statusCode: 400,
        message: 'Invalid data provided.'
      }

    case 'P2024':
      return {
        statusCode: 503,
        message: 'Database is temporarily busy. Please try again.'
      }

    case 'P2034':
      return {
        statusCode: 409,
        message: 'Transaction conflict. Please retry the request.'
      }

    case 'P2021':
    case 'P2022':
      return {
        statusCode: 500,
        message: 'Database schema mismatch.'
      }

    default:
      return null
  }
}

export const globalErrorHandler: ErrorHandler = (error, c) => {
  if (isAppError(error)) {
    return sendResponse(c, {
      statusCode: error.status,
      message: error.message,
      ...(error.errors !== undefined && {
        errors: error.errors
      })
    })
  }

  if (error instanceof HTTPException) {
    return sendResponse(c, {
      statusCode: toErrorStatusCode(error.status),
      message: error.message
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const normalized = normalizePrismaError(error)

    if (normalized) {
      return sendResponse(c, normalized)
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('[DATABASE INITIALIZATION ERROR]', error)

    return sendResponse(c, {
      statusCode: 503,
      message: 'Service temporarily unavailable.'
    })
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('[PRISMA VALIDATION ERROR]', error)

    return sendResponse(c, {
      statusCode: 500,
      message: 'Internal database query error.'
    })
  }

  console.error(`[UNHANDLED ERROR] ${new Date().toISOString()}`, error)

  return sendResponse(c, {
    statusCode: 500,
    message:
      config.node_env === 'development'
        ? error.message
        : 'Something went wrong. Please try again later.'
  })
}

export const notFoundHandler: NotFoundHandler = (c) => {
  return sendResponse(c, {
    statusCode: 404,
    message: `Route ${c.req.method} ${c.req.path} not found`
  })
}
