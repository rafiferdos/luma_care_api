import bcrypt from 'bcryptjs'
import type { TokenPayload } from 'google-auth-library'
import status from 'http-status'
import type { JwtPayload } from 'jsonwebtoken'

import config from '@/app/config/index.js'
import { verifyGoogleToken } from '@/app/lib/googleAuth.js'
import { prisma } from '@/app/lib/prisma.js'
import { AppError } from '@/utils/appError.js'
import { JwtUtils } from '@/utils/jwt.js'

import {
    AuthProvider,
  UserRole,
  UserStatus
} from '../../../../prisma/generated/prisma/enums.js'
import type {
  ILoginCredentials,
  IRegisterUserPayload
} from './auth.interface.js'

const loginUserIntoDB = async (payload: ILoginCredentials) => {
  const { email, password } = payload

  const user = await prisma.user.findUniqueOrThrow({
    where: { email }
  })

  if (!user.password) {
    throw new AppError(
      status.BAD_REQUEST,
      'This account was created with Google. Please continue with Google to log in.'
    )
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password)
  if (!isPasswordMatched)
    throw new AppError(status.UNAUTHORIZED, 'Invalid password')

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }

  const { accessToken, refreshToken } = JwtUtils.createAuthTokens(jwtPayload, {
    accessSecret: config.jwt_access_secret,
    accessExpiresIn: config.jwt_access_expires_in,
    refreshSecret: config.jwt_refresh_secret,
    refreshExpiresIn: config.jwt_refresh_expires_in
  })

  const { password: _pw, ...safeUser } = user

  return {
    accessToken,
    refreshToken,
    user: safeUser
  }
}

const refreshToken = async (token: string) => {
  const decoded = JwtUtils.verifyToken<JwtPayload>(
    token,
    config.jwt_refresh_secret
  )

  const { id } = decoded

  const user = await prisma.user.findUnique({
    where: { id }
  })

  if (!user) throw new AppError(status.NOT_FOUND, 'User not found')

  const jwtPayload = {
    id,
    name: user.name,
    email: user.email,
    role: user.role
  }

  const { accessToken } = JwtUtils.createAuthTokens(jwtPayload, {
    accessSecret: config.jwt_access_secret,
    accessExpiresIn: config.jwt_access_expires_in,
    refreshSecret: config.jwt_refresh_secret,
    refreshExpiresIn: config.jwt_refresh_expires_in
  })

  return { accessToken }
}

const registerUserIntoDB = async (payload: IRegisterUserPayload) => {
  const { name, email, password, phone, role, address } = payload

  const user = await prisma.user.findUnique({
    where: { email }
  })
  if (user)
    throw new AppError(status.CONFLICT, 'User with this email already exists')

  const passwordHash = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds)
  )

  if (payload.role === UserRole.SUPER_ADMIN) {
    const adminExists = await prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN }
    })
    if (adminExists)
      throw new AppError(
        status.CONFLICT,
        'An super admin already exists. You cannot create multiple super admin accounts.'
      )
  }

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      phone,
      role,
      address
    }
  })

  const result = await prisma.user.findUnique({
    where: {
      id: newUser.id,
      email: newUser.email || email
    },
    omit: {
      password: true
    }
  })
  return result
}

const getMeFromDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId
    },
    omit: {
      password: true
    }
  })
  return user
}

const googleLoginIntoDB = async (credential: string) => {
  if (!credential || typeof credential !== 'string') {
    throw new AppError(
      status.BAD_REQUEST,
      'Google credential is required'
    )
  }

  let payload: TokenPayload | undefined | null

  // Only Google token verification errors should become "invalid credentials"
  try {
    payload = await verifyGoogleToken(credential)
  } catch {
    throw new AppError(
      status.UNAUTHORIZED,
      'Invalid Google credentials'
    )
  }

  // Required claims
  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new AppError(
      status.UNAUTHORIZED,
      'Invalid Google credentials'
    )
  }

  const email = payload.email.trim().toLowerCase()

  // 1. Prefer lookup by Google's stable user ID
  let user = await prisma.user.findUnique({
    where: {
      googleId: payload.sub
    }
  })

  // A googleId must never belong to a different email
  if (user && user.email.toLowerCase() !== email) {
    throw new AppError(
      status.UNAUTHORIZED,
      'Invalid Google credentials'
    )
  }

  // 2. Fallback to email lookup for an existing account
  if (!user) {
    user = await prisma.user.findUnique({
      where: {
        email
      }
    })
  }

  // 3. Existing account checks
  if (user) {
    if (user.role !== UserRole.PATIENT) {
      throw new AppError(
        status.FORBIDDEN,
        'Google login is only available for patient accounts.'
      )
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new AppError(
        status.FORBIDDEN,
        'Your account has been BLOCKED. Please contact support.'
      )
    }

    if (user.status === UserStatus.DELETED || user.isDeleted) {
      throw new AppError(
        status.FORBIDDEN,
        'This account is no longer available.'
      )
    }

    // Link existing patient account to Google
    if (!user.googleId) {
      user = await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          googleId: payload.sub,
          authProvider: AuthProvider.GOOGLE,
          isEmailVerified: true
        }
      })
    }
  }

  // 4. New Google patient
  if (!user) {
    const name =
      payload.name?.trim() ||
      email.split('@')[0] ||
      'Patient'

    user = await prisma.user.create({
      data: {
        name,
        email,
        password: null,
        role: UserRole.PATIENT,
        googleId: payload.sub,
        authProvider: AuthProvider.GOOGLE,
        isEmailVerified: true,

        patient: {
          create: {
            name,
            email,
            status: UserStatus.ACTIVE
          }
        }
      }
    })
  }

  // 5. Create our own JWTs
  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }

  const { accessToken, refreshToken } =
    JwtUtils.createAuthTokens(jwtPayload, {
      accessSecret: config.jwt_access_secret,
      accessExpiresIn: config.jwt_access_expires_in,
      refreshSecret: config.jwt_refresh_secret,
      refreshExpiresIn: config.jwt_refresh_expires_in
    })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      authProvider: user.authProvider,
      isEmailVerified: user.isEmailVerified
    }
  }
}

export const AuthServices = {
  login: loginUserIntoDB,
  refreshToken,
  register: registerUserIntoDB,
  getMe: getMeFromDB,
  googleLogin: googleLoginIntoDB
}
