import type { NextFunction, Request, Response } from 'express'
import status from 'http-status'

import type { UserRole } from '../../../prisma/generated/prisma/enums'
import { AppError } from '../../utils/appError'
import catchAsync from '../../utils/catchAsync'
import JwtUtils from '../../utils/jwt'
import config from '../config'
import { prisma } from '../lib/prisma'

type TVerifyResult<T> =
  | Readonly<{ ok: true; payload: T }>
  | Readonly<{
      ok: false
      error: { kind: 'expired' | 'not-before' | 'invalid'; message: string }
    }>

type TAccessTokenPayload = {
  id: string
  email: string
  name: string
  role: UserRole
}

const extractToken = (req: Request): string | null => {
  const cookie = req.cookies?.accessToken as string | undefined

  if (cookie) {
    const result = JwtUtils.tryVerifyToken(cookie, config.jwt_access_secret)
    if (result.ok) return cookie
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return null
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
}

const TOKEN_ERROR_MESSAGES: Record<
  'expired' | 'not-before' | 'invalid',
  string
> = {
  expired: 'Your session has expired. Please log in again.',
  'not-before': 'Token is not yet valid. Please try again shortly.',
  invalid: 'Invalid token. Please log in again.'
}

export const auth = (...roles: UserRole[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req)
    if (!token)
      throw new AppError(
        status.UNAUTHORIZED,
        'No token provided. Please log in.'
      )

    const result: TVerifyResult<TAccessTokenPayload> = JwtUtils.tryVerifyToken(
      token,
      config.jwt_access_secret
    )

    if (!result.ok)
      throw new AppError(
        status.UNAUTHORIZED,
        TOKEN_ERROR_MESSAGES[result.error.kind]
      )

    const { id, role } = result.payload

    if (roles.length && !roles.includes(role))
      throw new AppError(
        status.FORBIDDEN,
        'You do not have permission to perform this action.'
      )
    const user = await prisma.user.findUnique({ where: { id } })

    if (!user)
      throw new AppError(status.UNAUTHORIZED, 'This account no longer exists.')

    if (user.status === 'BANNED')
      throw new AppError(
        status.FORBIDDEN,
        'Your account has been banned. Please contact support.'
      )

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }

    next()
  })
