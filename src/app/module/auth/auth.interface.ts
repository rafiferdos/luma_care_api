import type { UserRole } from '@/generated/prisma/enums.js'

export interface IRegisterUserPayload {
  name: string
  email: string
  password: string
  phone?: string
  role?: UserRole
  address?: string
  profileImage?: string
}

export interface ILoginCredentials {
  email: string
  password: string
}

export interface ILoginResponse {
  accessToken: string
}
