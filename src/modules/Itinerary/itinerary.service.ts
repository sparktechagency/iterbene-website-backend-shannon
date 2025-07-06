import { Types } from 'mongoose';
import { IItinerary } from './Itinerary.interface';
import { Itinerary } from './itinerary.model';
import ApiError from '../../errors/ApiError';

const createItinerary = async (
  userId: Types.ObjectId,
  payload: Partial<IItinerary>
): Promise<IItinerary> => {
  const itinerary = await Itinerary.create({
    ...payload,
    userId,
    postId: new Types.ObjectId(),
  });
  return itinerary;
};

const getItinerary = async (id: string): Promise<IItinerary> => {
  const itinerary = await Itinerary.findById(id).populate('postId');
  if (!itinerary) {
    throw new ApiError(404, 'Itinerary not found');
  }
  return itinerary;
};

const getUserItineraries = async (
  userId: string,
  page: number,
  limit: number
): Promise<any> => {
  return Itinerary.paginate({ userId }, { page, limit, populate: 'postId' });
};

const updateItinerary = async (
  userId: string,
  id: string,
  payload: Partial<IItinerary>
) => {
  const itinerary = await Itinerary.findOne({ _id: id, userId });
  if (!itinerary) {
    throw new ApiError(404, 'Itinerary not found');
  }
  return Itinerary.findOneAndUpdate({ _id: id }, payload, { new: true })
};

export const ItineraryService = {
  createItinerary,
  getItinerary,
  getUserItineraries,
  updateItinerary,
};
