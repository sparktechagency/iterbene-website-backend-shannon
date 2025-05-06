import { Router } from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../shared/validateRequest';
import { UserValidation } from '../user/user.validation';
import { AuthValidation } from './auth.validations';
import auth from '../../middlewares/auth';
import rateLimit from 'express-rate-limit';
import loggingMiddleware from '../../middlewares/loggingMiddleware';
const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.',
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
});

const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many email verification attempts. Please try again later.',
});

const resendOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many OTP resend requests. Please try again later.',
});

// Apply logging middleware to all routes
// router.use(loggingMiddleware);

router.post(
  '/register',
  validateRequest(UserValidation.createUserValidationSchema),
  AuthController.register
);

router.post(
  '/login',
  loginLimiter,
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login
);

router.post(
  '/verify-email',
  verifyEmailLimiter,
  validateRequest(AuthValidation.verifyEmailValidationSchema),
  AuthController.verifyEmail
);

router.post('/resend-otp', resendOtpLimiter, AuthController.resendOtp);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword
);

router.post(
  '/change-password',
  auth('common'),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

router.post('/logout', AuthController.logout);

router.post('/refresh-token', AuthController.refreshToken);

router.post('/enable-mfa', auth('common'), AuthController.enableMFA);

router.get('/interaction-logs/:userId', auth('admin'));

router.get('/interaction-logs', auth('admin'));

export const AuthRoutes = router;
