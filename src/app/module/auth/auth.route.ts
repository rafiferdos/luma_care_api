// import { Router } from 'express'

import config from '@/app/config'
import { factory } from '@/factory'
import { sValidator } from '@hono/standard-validator'
import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { googleLoginSchema, loginSchema, registerSchema } from './auth.schema'
import { validationHook } from '@/utils/validation'
import { AuthServices } from './auth.service'
import { sendResponse } from '@/utils/sendResponse'
import { status } from 'http-status'
import { AppError } from '@/utils/appError'

// import { AuthControllers } from './auth.controller.js'
// import { UserRole } from '../../../../prisma/generated/prisma/browser.js'
// import { auth } from '@/app/middlewares/auth.js'

// const router = Router()

// const ALL_ROLES = [
//   UserRole.ADMIN,
//   UserRole.DOCTOR,
//   UserRole.PATIENT,
//   UserRole.SUPER_ADMIN
// ]

// router.post('/login', AuthControllers.login)
// router.post('/refresh-token', AuthControllers.refreshToken)
// router.post('/register', AuthControllers.register)
// router.get('/me', auth(...ALL_ROLES), AuthControllers.getMe)
// router.post('/google', AuthControllers.googleLogin)

// export const AuthRoutes = router

const authRoutes = factory.createApp()

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? ('None' as const) : ('Lax' as const)
}

const setAccessTokenCookie = (c: Context, accessToken: string) => {
  setCookie(c, 'access_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 // 15 minutes
  })
}

const setRefreshTokenCookie = (c: Context, refreshToken: string) => {
  setCookie(c, 'refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 // 7 days
  })
}

const setAuthCookies = (
  c: Context,
  accessToken: string,
  refreshToken: string
) => {
  setAccessTokenCookie(c, accessToken)
  setRefreshTokenCookie(c, refreshToken)
}

authRoutes.post(
  '/login',
  sValidator('json', loginSchema, validationHook),
  async (c) => {
    const payload = c.req.valid('json')
    const result = await AuthServices.login(payload)
    setAuthCookies(c, result.accessToken, result.refreshToken)
    return sendResponse(c, {
      message: 'Login successful',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      }
    })
  }
)

authRoutes.post(
  '/register',
  sValidator('json', registerSchema, validationHook),
  async (c) => {
    const payload = c.req.valid('json')

    const user = await AuthServices.register(payload)

    return sendResponse(c, {
      statusCode: 201,
      message: 'User registered successfully',
      data: user
    })
  }
)

authRoutes.post('/refresh-token', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')

  if (!refreshToken) {
    throw new AppError(status.UNAUTHORIZED, 'Refresh token not found')
  }
  const { accessToken } = await AuthServices.refreshToken(refreshToken)
  setAccessTokenCookie(c, accessToken)

  return sendResponse(c, {
    message: 'Access token refreshed successfully',
    data: {
      accessToken
    }
  })
})

authRoutes.get('/me', async (c) => {
  const user = await AuthServices.getMe(c.var.user.id)

  return sendResponse(c, {
    data: user
  })
})

authRoutes.post(
  '/google',
  sValidator('json', googleLoginSchema, validationHook),
  async (c) => {
    const { credential } = c.req.valid('json')

    const result = await AuthServices.googleLogin(credential)

    setAuthCookies(c, result.accessToken, result.refreshToken)

    return sendResponse(c, {
      message: 'Logged in with Google successfully',
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    })
  }
)

export const AuthRoutes = authRoutes
