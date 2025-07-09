import ApiError from '../../errors/ApiError';
import { User } from '../user/user.model';
import { Maps } from './maps.model';
import { StatusCodes } from 'http-status-codes';

// Enhanced myMaps function with distance and images
const myMaps = async (userId: string) => {
  const user = await User.findById(userId);
  const myMapsData = await Maps.findOne({ userId: user?._id }).select(
    'visitedLocation.latitude visitedLocation.longitude interestedLocation.latitude interestedLocation.longitude'
  );
  const userCurrentLocation = user?.location;

  if (!userCurrentLocation) {
    throw new Error('User current location not found');
  }
  const result = {
    userCurrentLocation,
    visitedLocations: myMapsData?.visitedLocation || [],
    interestedLocations: myMapsData?.interestedLocation || [],
  };
  return result;
};

const addInterestedLocation = async (
  userId: string,
  interestedLocation: {
    latitude: number;
    longitude: number;
    interestedLocationName: string;
  }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const maps = await Maps.findOne({ userId });

  if (maps) {
    // Check for duplicate interestedLocation
    const isDuplicate = maps.interestedLocation.find(
      location =>
        location.latitude == interestedLocation.latitude &&
        location.longitude == interestedLocation.longitude &&
        location.interestedLocationName ==
          interestedLocation.interestedLocationName
    );
    if (!isDuplicate) {
      maps.interestedLocation.push(interestedLocation);
      await maps.save();
    }

  } else {
    const newMaps = new Maps({
      userId,
      interestedLocation: [interestedLocation],
    });
    await newMaps.save();
  }
};

export const MapsService = {
  myMaps,
  addInterestedLocation,
};
