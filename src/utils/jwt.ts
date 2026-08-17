import jwt, { type SignOptions } from 'jsonwebtoken'

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

type JwtObjectPayload = Record<string, unknown>

type Expiry = SignOptions['expiresIn']
type ExpiryInput = string | number

type AuthTokenConfig = Readonly<{
  accessSecret: string
  accessExpiresIn: ExpiryInput
  refreshSecret: string
  refreshExpiresIn: ExpiryInput
}>

type JwtVerifyErrorKind = 'expired' | 'not-before' | 'invalid'

type JwtVerifyError = Readonly<{
  kind: JwtVerifyErrorKind
  message: string
  cause?: unknown
}>

type VerifyResult<T> =
  | Readonly<{ ok: true; payload: T }>
  | Readonly<{ ok: false; error: JwtVerifyError }>

type AuthTokens = Readonly<{
  accessToken: string
  refreshToken: string
}>

/* -------------------------------------------------------------------------- */
/*                               EXPIRY VALIDATION                            */
/* -------------------------------------------------------------------------- */

const EXPIRY_PATTERN =
  /^\d+(\.\d+)?\s?(ms|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|y|yr|yrs|year|years)$/i

const normalizeExpiry = (value: unknown): Expiry => {
  if (value === undefined || value === null) {
    throw new Error('JWT expiry is missing. Check your config/env value.')
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Invalid JWT expiry "${value}". It must be a positive finite number of seconds.`
      )
    }
    return value
  }

  if (typeof value !== 'string') {
    throw new Error(
      `Invalid JWT expiry type: ${typeof value}. Expected string or number.`
    )
  }

  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error('Invalid JWT expiry. Empty string is not allowed.')
  }

  if (!EXPIRY_PATTERN.test(trimmed)) {
    throw new Error(
      `Invalid JWT expiry "${value}". Use values like "15m", "7d", "1h", or a plain number of seconds.`
    )
  }

  return trimmed as Expiry
}

/* -------------------------------------------------------------------------- */
/*                                LOW-LEVEL API                               */
/* -------------------------------------------------------------------------- */

export const createToken = (
  payload: JwtObjectPayload,
  secret: string,
  expiresIn: ExpiryInput
): string => {
  return jwt.sign(payload, secret, {
    expiresIn: normalizeExpiry(expiresIn)
  })
}

export const verifyToken = <T extends JwtObjectPayload = JwtObjectPayload>(
  token: string,
  secret: string
): T => {
  const decoded = jwt.verify(token, secret)

  if (typeof decoded === 'string') {
    throw new Error('JWT payload must be an object payload, not a string.')
  }

  return decoded as T
}

/* -------------------------------------------------------------------------- */
/*                              SAFE / NON-THROW API                          */
/* -------------------------------------------------------------------------- */

const toJwtVerifyError = (error: unknown): JwtVerifyError => {
  if (error instanceof Error) {
    switch (error.name) {
      case 'TokenExpiredError':
        return {
          kind: 'expired',
          message: error.message,
          cause: error
        }

      case 'NotBeforeError':
        return {
          kind: 'not-before',
          message: error.message,
          cause: error
        }

      default:
        return {
          kind: 'invalid',
          message: error.message || 'Invalid JWT.',
          cause: error
        }
    }
  }

  return {
    kind: 'invalid',
    message: 'Invalid JWT.',
    cause: error
  }
}

export const tryVerifyToken = <T extends JwtObjectPayload = JwtObjectPayload>(
  token: string,
  secret: string
): VerifyResult<T> => {
  try {
    return {
      ok: true,
      payload: verifyToken<T>(token, secret)
    }
  } catch (error) {
    return {
      ok: false,
      error: toJwtVerifyError(error)
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                              AUTH TOKEN HELPER                             */
/* -------------------------------------------------------------------------- */

export const createAuthTokens = <T extends JwtObjectPayload = JwtObjectPayload>(
  payload: T,
  config: AuthTokenConfig
): AuthTokens => {
  return {
    accessToken: createToken(
      payload,
      config.accessSecret,
      config.accessExpiresIn
    ),
    refreshToken: createToken(
      payload,
      config.refreshSecret,
      config.refreshExpiresIn
    )
  }
}

/* -------------------------------------------------------------------------- */
/*                                   EXPORTS                                  */
/* -------------------------------------------------------------------------- */

export const JwtUtils = {
  createToken,
  verifyToken,
  tryVerifyToken,
  createAuthTokens
} as const

export default JwtUtils
