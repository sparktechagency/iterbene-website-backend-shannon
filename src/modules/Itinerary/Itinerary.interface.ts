import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
export interface IActivity {
  time: string;
  description: string;
  link?: string;
  rating?: number;
  duration?: string;
  cost: number;
}

export interface IDay {
  dayNumber: number;
  location: {
    latitude: number;
    longitude: number;
  };
  activities: IActivity[];
  locationName: string;
  comment?: string;
  weather?: string;
}

export interface IItinerary {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  tripName: string;
  travelMode: string;
  departure: string;
  arrival: string;
  days: IDay[];
  overAllRating: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryModel extends Model<IItinerary> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IItinerary>>;
}