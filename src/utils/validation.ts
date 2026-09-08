import { flattenErrors } from '@hono/standard-validator'

import { AppError } from './appError.js'
import { UNPROCESSABLE_ENTITY } from './httpStatus.js'

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

  throw new AppError(UNPROCESSABLE_ENTITY, 'Validation failed', {
    errors: flattenErrors(result.error)
  })
}
