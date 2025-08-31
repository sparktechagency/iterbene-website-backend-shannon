import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
const xss = require('xss-clean');

import globalErrorHandler from './middlewares/globalErrorHandler';
import router from './routes';
import i18next from './i18n/i18n';
import i18nextMiddleware from 'i18next-express-middleware';
import notFound from './middlewares/notFound';
import { performanceMonitor } from './middlewares/performanceMiddleware';
import { config } from './config';

// Create Express application
const app = express();

/**
 * Get allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
  const origins = [...config.cors.allowedOrigins];

  // Add development origins in development mode
  if (process.env.NODE_ENV === 'development') {
    origins.push(...config.cors.developmentOrigins);
  }

  return origins;
};

/**
 * Get CORS configuration options
 */
const getCorsOptions = (allowedOrigins: string[]) => {
  return {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) => {
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
      'X-CSRF-Token',
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Cache preflight response for 24 hours
  };
};

/**
 * Configure rate limiter
 */
const getRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => {
      return req.path === '/test' || req.path === '/health';
    },
  });
};

/**
 * Configure CSRF protection
 */
const getCsrfProtection = () => {
  const ignoreMethods =
    process.env.NODE_ENV === 'development'
      ? ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'POST', 'PATCH', 'PUT']
      : ['GET', 'HEAD', 'OPTIONS'];

  return csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
    ignoreMethods,
  });
};

/**
 * Configure Helmet security headers
 */
const getHelmetConfig = (allowedOrigins: string[]) => {
  return helmet({
    hsts: {
      includeSubDomains: true,
      preload: true,
      maxAge: 63072000, // 2 years in seconds
    },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: [
          "'self'",
          'https://polyfill.io',
          'https://*.cloudflare.com',
          'http://127.0.0.1:3000/',
        ],
        baseUri: ["'self'"],
        scriptSrc: [
          "'self'",
          'http://127.0.0.1:3000/',
          'https://*.cloudflare.com',
          'https://polyfill.io',
          process.env.NODE_ENV === 'development'
            ? "'unsafe-inline'"
            : "'strict-dynamic'",
        ],
        styleSrc: ["'self'", 'https:', 'http:', "'unsafe-inline'"],
        imgSrc: ["'self'", 'blob:', 'validator.swagger.io', '*'],
        fontSrc: ["'self'", 'https:', 'data:'],
        childSrc: ["'self'", 'blob:'],
        styleSrcAttr: ["'self'", "'unsafe-inline'", 'http:'],
        frameSrc: ["'self'"],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    originAgentCluster: true,
  });
};

/**
 * Configure additional security headers
 */
const getAdditionalSecurityHeaders = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'fullscreen=(self), camera=(), geolocation=(self), autoplay=(), payment=(), microphone=()'
    );
    next();
  };
};

/**
 * Configure MongoDB sanitization
 */
const getMongoSanitizeConfig = () => {
  return mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized key: ${key} in request from ${req.ip}`);
    },
  });
};

/**
 * Configure HTTP Parameter Pollution protection
 */
const getHppConfig = () => {
  return hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'filter'],
  });
};

/**
 * Log suspicious activity patterns
 */
const logSuspiciousActivity = (req: Request, ip: string | undefined): void => {
  const bodyStr = JSON.stringify(req.body);
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\$ne|\$gt|\$lt|\$regex/i, // MongoDB injection patterns
    /union\s+select/i, // SQL injection patterns
    /exec\s*\(/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(bodyStr)) {
      console.warn(
        `⚠️ Suspicious pattern detected from IP ${ip}: ${pattern.source}`
      );
      break;
    }
  }
};

/**
 * Configure security logging middleware
 */
const getSecurityLoggingMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const origin = req.get('Origin');

    // Log security-relevant information
    console.log(
      `${timestamp} - ${req.method} ${
        req.url
      } - IP: ${ip} - Origin: ${origin} - UA: ${userAgent?.substring(0, 100)}`
    );

    // Log suspicious activities
    if (req.body && typeof req.body === 'object') {
      logSuspiciousActivity(req, ip);
    }

    next();
  };
};

/**
 * Configure security error handler
 */
const getSecurityErrorHandler = () => {
  return (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    // Log security-related errors
    if (error.code === 'EBADCSRFTOKEN') {
      console.warn(`🛡️ CSRF token validation failed from IP: ${req.ip}`);
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }

    if (error.message === 'Not allowed by CORS') {
      console.warn(
        `🛡️ CORS violation from origin: ${req.get('Origin')} - IP: ${req.ip}`
      );
      res.status(403).json({ error: 'CORS policy violation' });
      return;
    }

    // Use existing global error handler
    globalErrorHandler(error, req, res, next);
  };
};

// =====================
// Basic Express Setup
// =====================

// Trust proxy - important for getting real IP addresses behind reverse proxy
app.set('trust proxy', 1);

// Disable x-powered-by header for security obscurity
app.disable('x-powered-by');

// Compression middleware
app.use(compression());

// Body parser with security limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser
app.use(cookieParser());

// =====================
// CORS Configuration
// =====================

const allowedOrigins = getAllowedOrigins();
const corsOptions = getCorsOptions(allowedOrigins);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// =====================
// Static File Serving
// =====================

// Static file serving with security headers
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

// Serve static assets
app.use('/public', express.static(path.join(__dirname, '../public')));

// =====================
// General Middlewares
// =====================

// i18next middleware
app.use(i18nextMiddleware.handle(i18next));

// Performance monitoring
app.use(performanceMonitor);

// =====================
// Security Middlewares
// =====================

// Rate limiting
app.use(getRateLimiter());

// CSRF Protection
if (process.env.NODE_ENV !== 'development') {
  app.use(getCsrfProtection());
}

// Helmet security headers
app.use(getHelmetConfig(allowedOrigins));

// Additional security headers
app.use(getAdditionalSecurityHeaders());

// XSS Protection
app.use(xss());

// NoSQL Injection Protection
app.use(getMongoSanitizeConfig());

// HTTP Parameter Pollution Protection
app.use(getHppConfig());

// Security logging middleware
app.use(getSecurityLoggingMiddleware());

// =====================
// Routes
// =====================

// Main API routes
app.use('/api/v1', router);

// Health check endpoints
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the Iter Bene website backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    security: {
      cors: 'enabled',
      helmet: 'enabled',
      rateLimit: 'enabled',
      csrf: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled',
      xss: 'enabled',
      hpp: 'enabled',
      mongoSanitize: 'enabled',
    },
  });
});

// Detailed health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// =====================
// Error Handling
// =====================

// 404 handler should come before error handler
app.use(notFound);

// Enhanced global error handler with security logging
app.use(getSecurityErrorHandler());

export default app;
