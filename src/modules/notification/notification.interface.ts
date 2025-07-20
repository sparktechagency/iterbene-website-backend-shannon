import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface INotification {
  _id?: Types.ObjectId;
  senderId?: Types.ObjectId | string;
  receiverId?: Types.ObjectId | string;
  title: string;
  message?: string;
  image?: string;
  type:
    | 'post'
    | 'story'
    | 'comment'
    | 'event'
    | 'group'
    | 'connection'
    | 'message';
  linkId?: Types.ObjectId | string;
  role: 'admin' | 'user';
  viewStatus?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotificationModal extends Model<INotification> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<INotification>>;
}
