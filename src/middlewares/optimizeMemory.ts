import { Request, Response, NextFunction } from 'express';

const optimizeMemory = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (global.gc) {
      global.gc();
    }
  });

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
};

export default optimizeMemory;