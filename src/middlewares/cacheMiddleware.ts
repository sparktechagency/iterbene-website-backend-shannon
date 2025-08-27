import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

// In-memory cache (you can replace with Redis for production)
const cache = new Map<string, { data: any; expires: number }>();

// Cache cleanup interval (run every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires < now) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Generate cache key from request
const generateCacheKey = (req: Request): string => {
  const { method, originalUrl, user } = req;
  const userId = user?.userId || 'anonymous';
  const keyString = `${method}:${originalUrl}:${userId}`;
  return createHash('md5').update(keyString).digest('hex');
};

// Cache middleware factory
export const cacheResponse = (durationInSeconds: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const cached = cache.get(cacheKey);

    // Return cached response if valid
    if (cached && cached.expires > Date.now()) {
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = (data: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          expires: Date.now() + (durationInSeconds * 1000),
        });
      }
      return originalJson(data);
    };

    next();
  };
};

// Cache for specific routes
export const cacheFor = {
  SHORT: cacheResponse(60), // 1 minute
  MEDIUM: cacheResponse(300), // 5 minutes  
  LONG: cacheResponse(900), // 15 minutes
  VERY_LONG: cacheResponse(3600), // 1 hour
};

// Clear cache by pattern
export const clearCacheByPattern = (pattern: string) => {
  const keys = Array.from(cache.keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
};

// Cache statistics
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()).slice(0, 10), // First 10 keys for debugging
  };
};