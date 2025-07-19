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

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  })
);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Next.js dev server
  'http://localhost:5173', // Custom port if used
  'https://rakib3000.sobhoy.com',
  'http://10.10.7.66:3000',
  'http://10.10.7.66:7002',
  'http://10.10.7.66:4173',
  'http://localhost:7003',
  'https://rakib7002.sobhoy.com',
  'https://inter-bene-website-client.vercel.app'
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// File serving
app.use('/uploads', express.static(path.join(__dirname, '../Uploads/')));

// i18next middleware
app.use(i18nextMiddleware.handle(i18next));

// Routes
app.use('/api/v1', router);

// Health check
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the Inter Bene website backend' });
});

// Error handling
app.use(globalErrorHandler);
app.use(notFound);

export default app;