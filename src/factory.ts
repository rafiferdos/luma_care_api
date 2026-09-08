import { createFactory } from 'hono/factory'

import type { UserRole } from '../prisma/generated/prisma/enums.js'

export type AuthUser = Readonly<{
  id: string
  name: string
  email: string
  role: UserRole
}>

export type AppEnv = {
  Variables: {
    user: AuthUser
  }
}

export const factory = createFactory<AppEnv>()
