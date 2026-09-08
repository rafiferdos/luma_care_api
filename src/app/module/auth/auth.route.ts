// import { Router } from 'express'

import config from '@/app/config'
import { factory } from '@/factory'
import { sValidator } from '@hono/standard-validator'
import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import { loginSchema } from './auth.schema'
import { validationHook } from '@/utils/validation'
import { AuthServices } from './auth.service'
import { sendResponse } from '@/utils/sendResponse'

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
