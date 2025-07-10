import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface ISavedPostItinerary {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  postId:  Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISavedPostItineraryModel extends Model<ISavedPostItinerary> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<ISavedPostItinerary>>;
}
