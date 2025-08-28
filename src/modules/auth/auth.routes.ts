import { Router } from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../shared/validateRequest';
import { UserValidation } from '../user/user.validation';
import { AuthValidation } from './auth.validations';
import {
  fullAuth,
  emailVerificationAuth,
  multiTokenAuth,
  resetPasswordAuth,
} from '../../middlewares/smartAuth';
const router = Router();

router.post(
  '/register',
  validateRequest(UserValidation.createUserValidationSchema),
  AuthController.register
);

router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login
);

router.post(
  '/verify-email',
  multiTokenAuth(),
  validateRequest(AuthValidation.verifyEmailValidationSchema),
  AuthController.verifyEmail
);

router.post(
  '/resend-otp',
  multiTokenAuth(),
  validateRequest(AuthValidation.resendOtpValidationSchema),
  AuthController.resendOtp
);

router.post(
  '/forgot-password',
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  resetPasswordAuth(),
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword
);

router.post(
  '/change-password',
  fullAuth('Common'),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

router.post('/logout', AuthController.logout);

router.post('/refresh-token', AuthController.refreshToken);

export const AuthRoutes = router;
