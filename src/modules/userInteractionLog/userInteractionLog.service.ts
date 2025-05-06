import { Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { IUserInteractionLog } from './userInteractionLog.interface';
import { UserInteractionLog } from './userInteractionLog.model';

const createLog = async (
  userId: Types.ObjectId | undefined,
  action: string,
  endpoint: string,
  method: string,
  ip: string,
  userAgent: string,
  payload: Record<string, any> = {},
  statusCode?: number
) => {
  const sanitizedPayload = { ...payload };
  if (sanitizedPayload.password) delete sanitizedPayload.password;
  if (sanitizedPayload.email) {
    sanitizedPayload.email = sanitizedPayload.email.replace(
      /(.{1}).*@/,
      '$1***@'
    );
  }

  await UserInteractionLog.create({
    userId,
    action,
    endpoint,
    method,
    ip,
    userAgent,
    payload: sanitizedPayload,
    statusCode,
  });
};

const getUserLogs = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IUserInteractionLog>> => {
  if (!Types.ObjectId.isValid(filters.userId)) {
    throw new Error('Invalid user ID.');
  }
  options.sortBy = options.sortBy || 'createdAt:desc';
  options.populate = [
    {
      path: 'userId',
      select: 'fullName email phoneNumber profileImage',
    },
  ];
  return await UserInteractionLog.paginate(filters, options);
};

const getAllLogs = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IUserInteractionLog>> => {
  options.sortBy = options.sortBy || 'createdAt:desc';
  options.populate = [
    {
      path: 'userId',
      select: 'fullName email phoneNumber profileImage',
    },
  ];
  return await UserInteractionLog.paginate(filters, options);
};

export const UserInteractionLogService = {
  createLog,
  getUserLogs,
  getAllLogs,
};
