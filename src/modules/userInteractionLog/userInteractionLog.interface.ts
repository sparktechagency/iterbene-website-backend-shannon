import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
export interface IUserInteractionLog {
  userId?: Types.ObjectId;
  action: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  payload?: Record<string, any>;
  statusCode?: number;
}

export interface IUserInteractionLogModal extends Model<IUserInteractionLog> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IUserInteractionLog>>;
}
