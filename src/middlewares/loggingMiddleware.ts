import { Request, Response, NextFunction } from 'express';

const loggingMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { method, originalUrl, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'unknown';
  const userId = req.user?.userId;

  res.on('finish', async () => {
    const status = res.statusCode;

    const payload = { ...req.body };
    if (payload.password) delete payload.password;
    if (payload.email)
      payload.email = payload.email.replace(/(.{1}).*@/, '$1***@');
  });

  next();
};

export default loggingMiddleware;
