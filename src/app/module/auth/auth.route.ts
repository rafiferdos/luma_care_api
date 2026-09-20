import { auth } from '@/app/middlewares/auth'
import { factory } from '@/factory'
import { AppError } from '@/utils/appError'
import {
  getRefreshTokenCookie,
  setAccessTokenCookie,
  setAuthCookies
} from '@/utils/authCookie'
import { UNAUTHORIZED } from '@/utils/httpStatus'
import { sendResponse } from '@/utils/sendResponse'
import { validateRequest } from '@/utils/validation'

import { googleLoginSchema, loginSchema, registerSchema } from './auth.schema'
import { AuthServices } from './auth.service'

const authRoutes = factory.createApp()

authRoutes.post('/login', validateRequest(loginSchema), async (c) => {
  const payload = c.req.valid('json')

  const result = await AuthServices.login(payload)

  setAuthCookies(c, result)

  return sendResponse(c, {
    message: 'Login successful',
    data: {
      accessToken: result.accessToken,
      user: result.user
    }
  })
})

authRoutes.post('/register', validateRequest(registerSchema), async (c) => {
  const payload = c.req.valid('json')

  const user = await AuthServices.register(payload)

  return sendResponse(c, {
    statusCode: 201,
    message: 'User registered successfully',
    data: user
  })
})

authRoutes.post('/refresh-token', async (c) => {
  const refreshToken = getRefreshTokenCookie(c)

  if (!refreshToken) {
    throw new AppError(UNAUTHORIZED, 'Refresh token not found')
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

authRoutes.get('/me', auth(), async (c) => {
  const user = await AuthServices.getMe(c.var.user.id)

  return sendResponse(c, {
    data: user
  })
})

authRoutes.post('/google', validateRequest(googleLoginSchema), async (c) => {
  const { credential } = c.req.valid('json')

  const result = await AuthServices.googleLogin(credential)

  setAuthCookies(c, result)

  return sendResponse(c, {
    message: 'Logged in with Google successfully',
    data: {
      accessToken: result.accessToken,
      user: result.user
    }
  })
})

export const AuthRoutes = authRoutes
