import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import config from '@/app/config'

import { toSeconds, type TimeUnit } from './time'

const AUTH_COOKIE_NAMES = {
  access: 'access_token',
  refresh: 'refresh_token'
} as const

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? ('None' as const) : ('Lax' as const),
  path: '/'
}

type AuthTokens = Readonly<{
  accessToken: string
  refreshToken: string
}>

const setTokenCookie = (
  c: Context,
  name: string,
  token: string,
  duration: number,
  unit: TimeUnit
) => {
  setCookie(c, name, token, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: toSeconds(duration, unit)
  })
}

export const setAccessTokenCookie = (
  c: Context,
  token: string,
  duration = 15,
  unit: TimeUnit = 'minute'
) => {
  setTokenCookie(c, AUTH_COOKIE_NAMES.access, token, duration, unit)
}

export const setRefreshTokenCookie = (
  c: Context,
  token: string,
  duration = 7,
  unit: TimeUnit = 'day'
) => {
  setTokenCookie(c, AUTH_COOKIE_NAMES.refresh, token, duration, unit)
}

export const setAuthCookies = (c: Context, tokens: AuthTokens) => {
  setAccessTokenCookie(c, tokens.accessToken)
  setRefreshTokenCookie(c, tokens.refreshToken)
}

export const getAccessTokenCookie = (c: Context) =>
  getCookie(c, AUTH_COOKIE_NAMES.access)

export const getRefreshTokenCookie = (c: Context) =>
  getCookie(c, AUTH_COOKIE_NAMES.refresh)

export const clearAuthCookies = (c: Context) => {
  const options = {
    path: '/',
    secure: config.isProduction
  }

  deleteCookie(c, AUTH_COOKIE_NAMES.access, options)
  deleteCookie(c, AUTH_COOKIE_NAMES.refresh, options)
}
