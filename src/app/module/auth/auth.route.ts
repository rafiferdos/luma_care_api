import { Router } from 'express'



import { AuthControllers } from './auth.controller.js'
import { UserRole } from '../../../../prisma/generated/prisma/browser.js';
import { auth } from '@/app/middlewares/auth.js';

const router = Router()

const ALL_ROLES = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.SUPER_ADMIN]

router.post('/login', AuthControllers.login)
router.post('/refresh-token', AuthControllers.refreshToken)
router.post('/register', AuthControllers.register)
router.get(
  '/me',
  auth(...ALL_ROLES),
  AuthControllers.getMe
)
router.post('/google', AuthControllers.googleLogin)

export const AuthRoutes = router
