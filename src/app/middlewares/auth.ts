import status from 'http-status'

import {
  type UserRole,
  UserStatus
} from '../../../prisma/generated/prisma/enums.js'
import type { AuthUser } from '../../factory.js'
import { factory } from '../../factory.js'
import { AppError } from '../../utils/appError.js'
import { getAccessTokenCookie } from '../../utils/authCookie.js'
import JwtUtils from '../../utils/jwt.js'
import config from '../config/index.js'
import { prisma } from '../lib/prisma.js'

type AccessTokenPayload = {
  id: string
  email: string
  name: string
  role: UserRole
}

const TOKEN_ERROR_MESSAGES = {
  expired: 'Your session has expired. Please log in again.',
  'not-before': 'Token is not yet valid. Please try again shortly.',
  invalid: 'Invalid token. Please log in again.'
} as const

const extractToken = (authorization?: string, cookie?: string) => {
  if (authorization) {
    return authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : authorization.trim()
  }

  return cookie ?? null
}

export const auth = (...allowedRoles: UserRole[]) =>
  factory.createMiddleware(async (c, next) => {
    const token = extractToken(
      c.req.header('Authorization'),
      getAccessTokenCookie(c)
    )

    if (!token) {
      throw new AppError(
        status.UNAUTHORIZED,
        'No token provided. Please log in.'
      )
    }

    const result = JwtUtils.tryVerifyToken<AccessTokenPayload>(
      token,
      config.jwt_access_secret
    )

    if (!result.ok) {
      throw new AppError(
        status.UNAUTHORIZED,
        TOKEN_ERROR_MESSAGES[result.error.kind]
      )
    }

    const user = await prisma.user.findUnique({
      where: {
        id: result.payload.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isDeleted: true
      }
    })

    if (!user) {
      throw new AppError(status.UNAUTHORIZED, 'This account no longer exists.')
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new AppError(
        status.FORBIDDEN,
        'Your account has been blocked. Please contact support.'
      )
    }

    if (user.status === UserStatus.DELETED || user.isDeleted) {
      throw new AppError(
        status.FORBIDDEN,
        'This account is no longer available.'
      )
    }

    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      throw new AppError(
        status.FORBIDDEN,
        'You do not have permission to perform this action.'
      )
    }

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    } satisfies AuthUser

    c.set('user', authUser)

    await next()
  })
