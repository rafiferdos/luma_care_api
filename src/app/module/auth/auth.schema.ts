import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, { message: 'Password is required' })
})

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  profileImage: z.string().trim().optional()
})

export const googleLoginSchema = z.object({
  credential: z.string().trim().min(1)
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>
