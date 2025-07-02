import { Client } from '@googlemaps/google-maps-services-js';
import { IPost } from '../post/post.interface';
import { TUser } from '../user/user.interface';
import { IHashtag } from '../hastag/hashtag.interface';
import { User } from '../user/user.model';
import { Hashtag } from '../hastag/hashtag.model';
import { Post } from '../post/post.model';
import { config } from '../../config';
import { Itinerary } from '../Itinerary/itinerary.model';

// Initialize Google Maps client
const googleMapsClient = new Client({});


// Interfaces according to your format
interface ISearchingLocation {
  locationName: string;
  imageUrl: string | null;
  visitedPlacesCount: number;
}

interface ISearchingLocationPost {
  userId: {
    _id: string;
    fullName: string;
    profileImage: string;
  };
  visitedLocationName: string;
  distance: number;
  days: number;
  rating: number;
}

interface SearchResult {
  locations: ISearchingLocation[];
  posts: ISearchingLocationPost[];
}

interface UsersHashtagsResult {
  users: TUser[];
  hashtags: IHashtag[];
}


// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance);
};

// Helper function to get photo URL from Google Places
const getPhotoUrl = (photoReference: string, maxWidth: number = 500): string => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${config.googleMapsApiKey}`;
};


// Modified search for locations with your specified format
const searchLocationPost = async (
  searchTerm: string,
  userId?: string
): Promise<SearchResult> => {
  try {
    let userLocation: { lat: number; lng: number } | null = null;
    
    // Get user location if userId is provided
    if (userId) {
      const user = await User.findById(userId).select('location');
      if (user && user.location) {
        userLocation = {
          lat: user.location.latitude || 0,
          lng: user.location.longitude || 0
        };
      }
    }

    // Step 1: Use Google Maps Places API to search for locations globally
    const placeSearchResponse = await googleMapsClient.textSearch({
      params: {
        query: searchTerm,
        key: config.googleMapsApiKey,
      },
    });

    const places = placeSearchResponse.data.results;
    if (!places || places.length === 0) {
      return { locations: [], posts: [] };
    }

    const locations: ISearchingLocation[] = [];
    const posts: ISearchingLocationPost[] = [];

    for (const place of places) {
      const locationName = place.name || '';
      const latitude = place.geometry?.location?.lat || 0;
      const longitude = place.geometry?.location?.lng || 0;

      // Get location image from Google Places Photos
      let locationImageUrl: string | null = null;
      if (place.photos && place.photos.length > 0) {
        const photoReference = place.photos[0].photo_reference;
        locationImageUrl = getPhotoUrl(photoReference);
      }

      // Get nearby attractions count
      const nearbySearchResponse = await googleMapsClient.placesNearby({
        params: {
          location: { lat: latitude, lng: longitude },
          radius: 50000, // 50 km radius
          key: config.googleMapsApiKey,
          type: 'tourist_attraction',
        },
      });

      const attractions = nearbySearchResponse.data.results || [];
      const visitedPlacesCount = attractions.length;

      // Add to locations array
      locations.push({
        locationName,
        imageUrl: locationImageUrl,
        visitedPlacesCount,
      });

      // Step 2: Search for related posts from the location
      const relatedPosts = await Post.find({
        $or: [
          { visitedLocationName: { $regex: new RegExp(searchTerm, 'i') } },
          { content: { $regex: new RegExp(searchTerm, 'i') } }
        ],
        isDeleted: false
      })
      .populate('userId', '_id fullName profileImage')
      .populate('itinerary')
      .lean();

      // Step 3: Search in itineraries for more posts
      const relatedItineraries = await Itinerary.find({
        $or: [
          { 'days.locationName': { $regex: new RegExp(searchTerm, 'i') } },
          { tripName: { $regex: new RegExp(searchTerm, 'i') } },
          { departure: { $regex: new RegExp(searchTerm, 'i') } },
          { arrival: { $regex: new RegExp(searchTerm, 'i') } }
        ],
        isDeleted: false
      })
      .populate({
        path: 'postId',
        populate: {
          path: 'userId',
          select: '_id fullName profileImage'
        }
      })
      .lean();

      // Process regular posts
      for (const post of relatedPosts) {
        if (!post.userId || typeof post.userId !== 'object') continue;

        let distance = 0;
        let days = 0;
        let rating = 0;

        // Calculate distance if user location and post location available
        if (userLocation && post.visitedLocation) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            post.visitedLocation.latitude,
            post.visitedLocation.longitude
          );
        }

        // Get itinerary details if available
        if (post.itinerary && typeof post.itinerary === 'object') {
          const itinerary = post.itinerary as any;
          days = itinerary.days?.length || 0;
          rating = itinerary.overAllRating || 0;
        }

        posts.push({
          userId: {
            _id: (post.userId as any)._id.toString(),
            fullName: (post.userId as any).fullName || '',
            profileImage: (post.userId as any).profileImage || '',
          },
          visitedLocationName: post.visitedLocationName || locationName,
          distance,
          days,
          rating,
        });
      }

      // Process itinerary posts
      for (const itinerary of relatedItineraries) {
        if (!itinerary.postId || !itinerary.postId?.userId) continue;

        const post = itinerary.postId as any;
        const user = post.userId;

        let distance = 0;

        // Calculate distance from itinerary location
        if (userLocation && itinerary.days && itinerary.days.length > 0) {
          const firstDay = itinerary.days[0];
          if (firstDay.location) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              firstDay.location.latitude,
              firstDay.location.longitude
            );
          }
        }

        posts.push({
          userId: {
            _id: user._id.toString(),
            fullName: user.fullName || '',
            profileImage: user.profileImage || '',
          },
          visitedLocationName: itinerary.departure || itinerary.arrival || locationName,
          distance,
          days: itinerary.days?.length || 0,
          rating: itinerary.overAllRating || 0,
        });
      }
    }

    // Remove duplicate posts based on userId and locationName
    const uniquePosts = posts.filter((post, index, self) =>
      index === self.findIndex((p) => 
        p.userId._id === post.userId._id && 
        p.visitedLocationName === post.visitedLocationName
      )
    );

    return {
      locations,
      posts: uniquePosts,
    };

  } catch (error: any) {
    console.error('Error in searchLocationPost:', error.message);
    throw new Error('Failed to search for location data');
  }
};

// Search for users and hashtags
const searchUsersHashtags = async (
  searchTerm: string
): Promise<UsersHashtagsResult> => {
  // Step 1: Search for users
  const userQuery = {
    $or: [{ fullName: { $regex: new RegExp(searchTerm, 'i') } }],
    //    role not equals Admin or Super_Admin
    role: { $nin: ['Admin', 'Super_Admin'] },
    isDeleted: false,
    isBanned: false,
  };

  const users = await User.find(userQuery)
    .select('fullName username profileImage')
    .lean();

  // Step 2: Search for hashtags
  const hashtagQuery = {
    name: { $regex: new RegExp(searchTerm, 'i') },
  };

  const hashtags = await Hashtag.find(hashtagQuery)
    .select('name postCount')
    .lean();

  return {
    users,
    hashtags,
  };
};
export const searchServices = {
  searchLocationPost,
  searchUsersHashtags
};