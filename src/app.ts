import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import path from 'path';
import globalErrorHandler from './middlewares/globalErrorHandler';
import router from './routes';
import i18next from './i18n/i18n';
import i18nextMiddleware from 'i18next-express-middleware';
import helmet from 'helmet';
import notFound from './middlewares/notFount';

import { performanceMonitor } from './middlewares/performanceMiddleware';

const app = express();

// Security headers with relaxed CSP for development
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Enhanced CORS configuration
const allowedOrigins = [
  'https://iterbene.com',
  'https://www.iterbene.com',
  'https://admin.iterbene.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4173',
  'http://localhost:7000',
  'http://10.10.7.66:3000',
  'http://10.10.7.66:5173',
];

// Development origins
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push(
    'http://localhost:8080',
    'http://localhost:8081',
    'http://10.10.7.66:3000',
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any localhost origin in development
      if (
        process.env.NODE_ENV === 'development' &&
        (origin.includes('localhost') || origin.includes('127.0.0.1'))
      ) {
        return callback(null, true);
      }

      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Accept-Language',
      'Accept-Encoding',
      'Connection',
      'User-Agent',
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Handle preflight requests explicitly
app.options('*', cors());

// Body parser with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser
app.use(cookieParser());

// File serving with CORS headers
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '../Uploads/'))
);

// i18next middleware
app.use(i18nextMiddleware.handle(i18next));

// Performance monitoring
app.use(performanceMonitor);

// Add request logging middleware
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.get(
      'Origin'
    )}`
  );
  next();
});

// Routes
app.use('/api/v1', router);

// Health check with more info
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the Iter Bene website backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    origin: req.get('Origin'),
    userAgent: req.get('User-Agent'),
  });
});

// 404 handler should come before error handler
app.use(notFound);

// Global error handler should be last
app.use(globalErrorHandler);

export default app;
