import { User } from '../user/user.model';
import { Maps } from './maps.model';

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

export const MapsService = {
  myMaps,
};
