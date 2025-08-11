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
const allowedOrigins = ['https://iterbene.com'];
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
  res
    .status(200)
    .json({ message: 'Welcome to the Inter Bene website backend' });
});

// Error handling
app.use(globalErrorHandler);
app.use(notFound);

export default app;
