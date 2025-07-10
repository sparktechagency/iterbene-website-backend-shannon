import { Model } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface ISavedPostItinerary {
  _id: string;
  userId: string;
  postId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISavedPostItineraryModel extends Model<ISavedPostItinerary> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<ISavedPostItinerary>>;
}
