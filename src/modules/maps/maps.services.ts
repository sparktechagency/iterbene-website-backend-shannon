import { User } from '../user/user.model';
import { Maps } from './maps.model';

const myMaps = async (userId: string) => {
  const user = await User.findById(userId);
  const myMaps = await Maps.findOne({ userId: user?._id });
  const userCurrentLocation = user?.location;
  const result = {
    myCurrentLocation: userCurrentLocation,
    interestedLocations: myMaps?.interestedLocation || [],
    visitedLocations: myMaps?.visitedLocation || [],
  };
  return result;
};

export const MapsService = {
  myMaps,
};
