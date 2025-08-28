import dotenv from 'dotenv';
dotenv.config();

export const config = {
  environment: process.env.NODE_ENV,
  port: process.env.PORT || 8083,
  socketPort: process.env.SOCKET || 8082,
  database: {
    mongoUrl:
      process.env.MONGODB_URL || 'mongodb://localhost:27017/mentor-service',
  },

  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      '1018b783185a124050d697313a5dc97f4b7e7f66f4fb82bc7f2998303e48604c',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'bc4b3506f99e4254fc3b8382bf135ffec4a4adf043720555dd0849cb51aa5b02',
      tokenSecret:
      process.env.TOKEN_SECRET ||
      '065ec2afe73bb1e47454907a56146e5b75ee441af05fe5bb82bdf169a1901d26',
    emailVerificationTokenExpiration:
      process.env.JWT_EMAIL_VERIFICATION_TOKEN_EXPIRATION_TIME || '30m',
    resetPasswordTokenExpiration:
      process.env.JWT_RESET_PASSWORD_TOKEN_EXPIRATION_TIME || '30m',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION_TIME || '5d',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION_TIME || '365d',
  },

  auth: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockTime: parseInt(process.env.LOCK_TIME || '2'),
  },

  otp: {
    verifyEmailOtpExpiration: parseInt(
      process.env.VERIFY_EMAIL_OTP_EXPIRATION_TIME || '30'
    ),
    resetPasswordOtpExpiration: parseInt(
      process.env.RESET_PASSWORD_OTP_EXPIRATION_TIME || '30'
    ),
    maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5'),
    attemptWindowMinutes: parseInt(process.env.ATTEMPT_WINDOW_MINUTES || '10'),
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
  },
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    username: process.env.SMTP_USERNAME || '',
    password: process.env.SMTP_PASSWORD || '',
    emailFrom: process.env.EMAIL_FROM || '',
  },
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:3000',
  },

  backend: {
    ip: process.env.BACKEND_IP || '10.0.60.220',
    baseUrl: `http://${process.env.BACKEND_IP}:${process.env.PORT}`,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME || 'your-bucket-name',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : [
          'https://iterbene.com',
          'https://www.iterbene.com',
          'https://admin.iterbene.com',
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:4173',
          'http://localhost:7000',
          'http://10.10.7.66:3000',
          'http://10.10.7.66:5173',
        ],
    developmentOrigins: process.env.DEV_ALLOWED_ORIGINS
      ? process.env.DEV_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : [
          'http://localhost:8080',
          'http://localhost:8081',
          'http://10.10.7.66:3000',
        ],
  },
};
