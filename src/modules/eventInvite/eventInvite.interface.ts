import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IEventInvite {
  _id?: string;
  from: Types.ObjectId;
  to: Types.ObjectId;
  eventId: Types.ObjectId;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEventInviteModel extends Model<IEventInvite> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IEventInvite>>;
}

export enum EventInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}
