import { flattenErrors } from '@hono/standard-validator'
import status from 'http-status'

import { AppError } from './appError.js'

type ValidationResult =
  | Readonly<{
      success: true
    }>
  | Readonly<{
      success: false
      error: Parameters<typeof flattenErrors>[0]
    }>

export const validationHook = (result: ValidationResult) => {
  if (result.success) return

  throw new AppError(status.UNPROCESSABLE_ENTITY, 'Validation failed', {
    errors: flattenErrors(result.error)
  })
}
