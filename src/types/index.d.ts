import { JwtPayload } from 'jsonwebtoken';
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
declare module 'express-xss-sanitizer' {
  import { RequestHandler } from 'express';
  export const xss: RequestHandler;
}
