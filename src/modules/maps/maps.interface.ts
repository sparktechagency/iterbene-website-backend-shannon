import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
export interface IMaps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  visitedLocation: [
    {
      latitude: number;
      longitude: number;
      visitedLocationName: string;
    }
  ];
  interestedLocation: [
    {
      latitude: number;
      longitude: number;
      interestedLocationName: string;
    }
  ];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMapsModel extends Model<IMaps> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IMaps>>;
}
