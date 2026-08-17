import config from '@/config/index.js'
import { verifyGoogleToken } from '@/lib/googleAuth.js'
import { prisma } from '@/lib/prisma.js'
import { AppError } from '@/utils/appError.js'
import { JwtUtils } from '@/utils/jwt.js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import status from 'http-status'
import type { JwtPayload } from 'jsonwebtoken'
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
    accessSecret: config.jwtSecret,
    accessExpiresIn: config.jwtExpiresIn,
    refreshSecret: config.jwtRefreshSecret,
    refreshExpiresIn: config.jwtRefreshExpiresIn
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
    config.jwtRefreshSecret
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
    accessSecret: config.jwtSecret,
    accessExpiresIn: config.jwtExpiresIn,
    refreshSecret: config.jwtRefreshSecret,
    refreshExpiresIn: config.jwtRefreshExpiresIn
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
    Number(config.bcryptSaltRounds)
  )

  if (payload.role === 'ADMIN') {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    if (adminExists)
      throw new AppError(
        status.CONFLICT,
        'An admin already exists. You cannot create multiple admin accounts.'
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
  const payload = await verifyGoogleToken(credential)
  if (!payload?.email)
    throw new AppError(status.UNAUTHORIZED, 'Invalid Google credential')

  let user = await prisma.user.findUnique({ where: { email: payload.email } })

  if (!user) {
    const randomPassword = await bcrypt.hash(
      crypto.randomBytes(16).toString('hex'),
      Number(config.bcryptSaltRounds)
    )
    const fallbackName =
      payload.name?.trim() || payload.email.split('@')[0] || 'User'

    user = await prisma.user.create({
      data: {
        name: fallbackName,
        email: payload.email,
        password: randomPassword,
        role: 'CUSTOMER',
        profileImage: payload.picture ?? null
      }
    })
  }

  if (user.status === 'BANNED')
    throw new AppError(
      status.FORBIDDEN,
      'Your account has been banned. Please contact support.'
    )

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
  const { accessToken, refreshToken } = JwtUtils.createAuthTokens(jwtPayload, {
    accessSecret: config.jwtSecret,
    accessExpiresIn: config.jwtExpiresIn,
    refreshSecret: config.jwtRefreshSecret,
    refreshExpiresIn: config.jwtRefreshExpiresIn
  })

  const { password: _pw, ...safeUser } = user
  return { accessToken, refreshToken, user: safeUser }
}

export const AuthServices = {
  login: loginUserIntoDB,
  refreshToken,
  register: registerUserIntoDB,
  getMe: getMeFromDB,
  googleLogin: googleLoginIntoDB
}
