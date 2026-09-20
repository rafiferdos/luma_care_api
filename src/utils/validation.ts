import { flattenErrors, sValidator } from '@hono/standard-validator'
import type { ZodType } from 'zod'

import { AppError } from './appError.js'
import { UNPROCESSABLE_ENTITY } from './httpStatus.js'

export const validateRequest = <T extends ZodType>(schema: T) =>
  sValidator('json', schema, (result) => {
    if (result.success) return

    throw new AppError(UNPROCESSABLE_ENTITY, 'Validation failed', {
      errors: flattenErrors(result.error)
    })
  })
