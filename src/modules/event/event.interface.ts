import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
export interface IEvent {
  _id?: Types.ObjectId;
  creatorId: Types.ObjectId;
  eventName: string;
  eventImage: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  duration: {
    days: number;
    nights: number;
  };
  locationName: string;
  privacy: EventPrivacy;
  coHosts: Types.ObjectId[];
  interestedUsers: Types.ObjectId[];
  pendingInterestedUsers: Types.ObjectId[];
  eventCost: number;
  interestCount: number;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum EventPrivacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
export interface IEventModel extends Model<IEvent> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IEvent>>;
}
