import { Types } from 'mongoose';
import { IItinerary } from './Itinerary.interface';
import { Itinerary } from './itinerary.model';
import ApiError from '../../errors/ApiError';

 async function createItinerary(
  userId: Types.ObjectId,
  payload: Partial<IItinerary>
): Promise<IItinerary> {
  const itinerary = await Itinerary.create({
    ...payload,
    userId,
    postId: new Types.ObjectId(), 
  });
  return itinerary;
}

 async function getItinerary(id: string): Promise<IItinerary> {
  const itinerary = await Itinerary.findById(id).populate('postId');
  if (!itinerary) {
    throw new ApiError(404, 'Itinerary not found');
  }
  return itinerary;
}

 async function getUserItineraries(
  userId: string,
  page: number,
  limit: number
): Promise<any> {
  return Itinerary.paginate({ userId }, { page, limit, populate: 'postId' });
}

export const ItineraryService = {
  createItinerary,
  getItinerary,
  getUserItineraries,
};