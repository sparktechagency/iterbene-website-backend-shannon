import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  // Override end method to log performance
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    // Calculate time and memory
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.originalUrl}`, {
        duration: `${duration.toFixed(2)}ms`,
        memory: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        status: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }

    // Log performance for requests in development (with throttling)
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration.toFixed(2)}ms`);
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// API rate limiter middleware
export const createRateLimiter = (maxRequests: number = 100, windowMs: number = 900000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (data.resetTime < now) {
        requests.delete(ip);
      }
    }
  }, 300000);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const userRequests = requests.get(ip);
    
    if (!userRequests || userRequests.resetTime < now) {
      // Reset or create new entry
      requests.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }
    
    userRequests.count++;
    next();
  };
};