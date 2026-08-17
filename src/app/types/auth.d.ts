import type { UserRole } from '@/generated/prisma/enums.ts'

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string
        id: string
        name: string
        role: UserRole
      }
    }
  }
}
