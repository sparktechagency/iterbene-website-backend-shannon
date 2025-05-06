import { Request, Response, NextFunction } from 'express';
import { UserInteractionLogService } from '../modules/userInteractionLog/userInteractionLog.service';

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

    await UserInteractionLogService.createLog(
      userId,
      `${method.toLowerCase()}_request`,
      originalUrl,
      method,
      ip || 'unknown',
      userAgent,
      payload,
      status
    );
  });

  next();
};

export default loggingMiddleware;
