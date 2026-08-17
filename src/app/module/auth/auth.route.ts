import { UserRole } from '@/generated/prisma/enums.js'
import { auth } from '@/middlewares/auth.js'
import { Router } from 'express'
import { AuthControllers } from './auth.controller.js'

const router = Router()

router.post('/login', AuthControllers.login)
router.post('/refresh-token', AuthControllers.refreshToken)
router.post('/register', AuthControllers.register)
router.get(
  '/me',
  auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.TECHNICIAN),
  AuthControllers.getMe
)
router.post('/google', AuthControllers.googleLogin)

export const AuthRoutes = router
