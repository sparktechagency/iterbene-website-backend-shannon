import { Client, PlaceType1 } from '@googlemaps/google-maps-services-js';
import { IPost } from '../post/post.interface';
import { TUser } from '../user/user.interface';
import { User } from '../user/user.model';
import { Post } from '../post/post.model';
import { config } from '../../config';
import calculateDistance from '../../utils/calculateDistance';
import { IHashtag } from '../hastag/hashtag.interface';
import { Hashtag } from '../hastag/hashtag.model';

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Interfaces
interface ISearchingLocation {
  locationName: string;
  imageUrl: string | null;
  visitedPlacesCount: number;
  locationId: string;
}

interface IVisitedPlace {
  placeName: string;
  placeId: string;
  imageUrl: string | null;
  rating: number;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  directionsUrl: string;
  distance?: number;
}

interface SearchResult {
  locations: ISearchingLocation[];
  posts: any[];
  totalLocations: number;
  totalPosts: number;
  totalPages: number;
}

interface UsersHashtagsResult {
  users: TUser[];
  hashtags: IHashtag[];
}

interface VisitedPlacesResult {
  visitedPlaces: IVisitedPlace[];
  totalPages: number;
}

// Helper function to get photo URL from Google Places
const getPhotoUrl = (
  photoReference: string,
  maxWidth: number = 500
): string => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${config.googleMapsApiKey}`;
};

// Helper function to generate Google Maps directions URL
const getDirectionsUrl = (
  destinationLat: number,
  destinationLng: number,
  destinationName: string
): string => {
  return `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}&destination_place_id=${encodeURIComponent(
    destinationName
  )}`;
};

// Helper function to validate pagination parameters
const validatePagination = (
  page: number,
  limit: number
): { page: number; limit: number } => {
  const maxLimit = 100;
  const validatedPage = Math.max(1, Math.floor(Number(page) || 1));
  const validatedLimit = Math.min(
    Math.max(1, Math.floor(Number(limit) || 10)),
    maxLimit
  );
  return { page: validatedPage, limit: validatedLimit };
};

// Search for locations with pagination and metadata
const searchLocationPost = async (
  searchTerm: string,
  userId?: string,
  page: number = 1,
  limit: number = 10
): Promise<SearchResult> => {
  try {
    if (!searchTerm?.trim()) {
      throw new Error('Search term is required');
    }

    // Validate pagination
    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );
    const skip = (validatedPage - 1) * validatedLimit;

    let userLocation: { lat: number; lng: number } | null = null;
    if (userId) {
      const user = await User.findById(userId).select('location');
      if (user && user.location) {
        userLocation = {
          lat: user.location.latitude || 0,
          lng: user.location.longitude || 0,
        };
      }
    }

    // Step 1: Google Maps Places API search for each allowed place type
    let allPlaces: any[] = [];
    const allowedPlaceTypes = [
      'country',
      'administrative_area_level_1',
      'locality',
    ];

    // Perform textSearch for each place type
    for (const placeType of allowedPlaceTypes) {
      let nextPageToken: string | undefined;

      do {
        const placeSearchResponse = await googleMapsClient.textSearch({
          params: {
            query: searchTerm,
            key: config.googleMapsApiKey,
            pagetoken: nextPageToken,
            type: placeType as PlaceType1,
          },
        });

        // Filter results to ensure only desired place types are included
        const filteredPlaces = (placeSearchResponse.data.results || []).filter(
          place => place.types?.includes(placeType as any)
        );

        allPlaces = allPlaces.concat(filteredPlaces);
        nextPageToken = placeSearchResponse.data.next_page_token;

        // Add delay to handle Google's pagination rate limit
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (nextPageToken && allPlaces.length < skip + validatedLimit);
    }

    // Remove duplicates based on place_id
    const uniquePlaces = Array.from(
      new Map(allPlaces.map(place => [place.place_id, place])).values()
    );

    const totalLocations = uniquePlaces.length;
    const paginatedPlaces = uniquePlaces.slice(skip, skip + validatedLimit);
    const totalPages = Math.ceil(totalLocations / validatedLimit);

    if (!paginatedPlaces.length) {
      return {
        locations: [],
        posts: [],
        totalLocations: 0,
        totalPosts: 0,
        totalPages: 0,
      };
    }

    const locations: ISearchingLocation[] = [];
    const posts: any[] = [];

    // Step 2: Process places and fetch posts
    for (const place of paginatedPlaces) {
      const locationName = place.name || '';
      const latitude = place.geometry?.location?.lat || 0;
      const longitude = place.geometry?.location?.lng || 0;

      let locationImageUrl: string | null = null;
      if (place?.photos && place?.photos?.length > 0) {
        const photoReference = place?.photos[0]?.photo_reference;
        locationImageUrl = getPhotoUrl(photoReference);
      }

      // Fetch all tourist attractions for accurate count
      let allAttractions: any[] = [];
      let attractionNextPageToken: string | undefined;

      do {
        const nearbySearchResponse = await googleMapsClient.placesNearby({
          params: {
            location: { lat: latitude, lng: longitude },
            radius: 50000,
            key: config.googleMapsApiKey,
            type: 'tourist_attraction',
            pagetoken: attractionNextPageToken,
          },
        });

        allAttractions = allAttractions.concat(
          nearbySearchResponse.data.results || []
        );
        attractionNextPageToken = nearbySearchResponse.data.next_page_token;

        // Add delay to handle Google's pagination rate limit
        if (attractionNextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (attractionNextPageToken);

      const visitedPlacesCount = allAttractions.length;

      locations.push({
        locationName,
        imageUrl: locationImageUrl,
        visitedPlacesCount,
        locationId: place.place_id || `${latitude}_${longitude}`,
      });
    }

    // Step 3: Search posts by location type
    const locationQuery = {
      visitedLocationName: { $regex: new RegExp(searchTerm, 'i') },
      isDeleted: false,
    };

    const totalPosts = await Post.countDocuments(locationQuery);
    const relatedPosts = await Post.find(locationQuery)
      .populate([
        {
          path: 'media',
          select: 'mediaType mediaUrl',
        }
      ])
      .select('media visitedLocation visitedLocationName')
      .skip(skip)
      .limit(validatedLimit)
      .lean();

    for (const post of relatedPosts) {
      if (!post.userId || typeof post.userId !== 'object') continue;

      let distance = 0;
      if (
        userLocation &&
        post.visitedLocation &&
        typeof post.visitedLocation.latitude === 'number' &&
        typeof post.visitedLocation.longitude === 'number'
      ) {
        distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          post.visitedLocation.latitude || 0,
          post.visitedLocation.longitude || 0
        );
      }
      posts.push({
        ...post,
        distance,
      });
    }

    return {
      locations,
      posts,
      totalLocations,
      totalPosts,
      totalPages,
    };
  } catch (error: any) {
    console.error('Error in searchLocationPost:', error.message);
    throw new Error(`Failed to search for location data: ${error.message}`);
  }
};

// Get visited places with pagination and metadata
const getLocationVisitedPlaces = async (
  locationName: string,
  locationId: string,
  userId?: string,
  radius: number = 50000,
  page: number = 1,
  limit: number = 10
): Promise<VisitedPlacesResult> => {
  try {
    if (!locationName?.trim() || !locationId?.trim()) {
      throw new Error('Location name and ID are required');
    }

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );
    const skip = (validatedPage - 1) * validatedLimit;

    let userLocation: { lat: number; lng: number } | null = null;
    if (userId) {
      const user = await User.findById(userId).select('location');
      if (user && user.location) {
        userLocation = {
          lat: user.location.latitude || 0,
          lng: user.location.longitude || 0,
        };
      }
    }

    let locationImageUrl: string | null = null;
    let latitude = 0;
    let longitude = 0;

    try {
      const placeDetailsResponse = await googleMapsClient.placeDetails({
        params: {
          place_id: locationId,
          key: config.googleMapsApiKey,
          fields: ['photos', 'geometry'],
        },
      });

      const placeDetails = placeDetailsResponse?.data?.result;
      if (placeDetails?.photos && placeDetails?.photos?.length > 0) {
        const photoReference = placeDetails?.photos[0]?.photo_reference;
        locationImageUrl = getPhotoUrl(photoReference);
      }
      latitude = placeDetails?.geometry?.location?.lat || 0;
      longitude = placeDetails?.geometry?.location?.lng || 0;
    } catch (error) {
      console.error('Could not fetch location image or geometry:', error);
    }

    let allAttractions: any[] = [];
    let nextPageToken: string | undefined;

    // Fetch tourist attractions
    do {
      const nearbySearchResponse = await googleMapsClient.placesNearby({
        params: {
          location: { lat: latitude, lng: longitude },
          radius,
          key: config.googleMapsApiKey,
          type: 'tourist_attraction',
          pagetoken: nextPageToken,
        },
      });

      allAttractions = allAttractions.concat(
        nearbySearchResponse.data.results || []
      );
      nextPageToken = nearbySearchResponse.data.next_page_token;

      // Add delay to handle Google's pagination rate limit
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } while (nextPageToken && allAttractions.length < skip + validatedLimit);

    // Fetch popular places
    nextPageToken = undefined;
    do {
      const popularPlacesResponse = await googleMapsClient.placesNearby({
        params: {
          location: { lat: latitude, lng: longitude },
          radius,
          key: config.googleMapsApiKey,
          type: 'point_of_interest',
          pagetoken: nextPageToken,
        },
      });

      allAttractions = allAttractions.concat(
        popularPlacesResponse.data.results || []
      );
      nextPageToken = popularPlacesResponse.data.next_page_token;

      // Add delay to handle Google's pagination rate limit
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } while (nextPageToken && allAttractions.length < skip + validatedLimit);

    const uniqueAttractions = allAttractions.filter(
      (place, index, self) =>
        index === self.findIndex(p => p.place_id === place.place_id)
    );

    const sortedAttractions = uniqueAttractions
      .filter(place => place.rating && place.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const totalVisitedPlaces = uniqueAttractions.length;
    const paginatedAttractions = sortedAttractions.slice(
      skip,
      skip + validatedLimit
    );
    const totalPages = Math.ceil(totalVisitedPlaces / validatedLimit);

    const visitedPlaces: IVisitedPlace[] = [];

    for (const attraction of paginatedAttractions) {
      const placeName = attraction.name || '';
      const placeId = attraction.place_id || '';
      const placeRating = attraction.rating || 0;
      const placeAddress = attraction.vicinity || '';
      const placeLat = attraction.geometry?.location?.lat || 0;
      const placeLng = attraction.geometry?.location?.lng || 0;

      let placeImageUrl: string | null = null;
      if (attraction.photos && attraction.photos.length > 0) {
        const photoReference = attraction.photos[0].photo_reference;
        placeImageUrl = getPhotoUrl(photoReference);
      }

      const directionsUrl = getDirectionsUrl(placeLat, placeLng, placeName);

      let distanceFromUser: number | undefined;
      if (userLocation) {
        distanceFromUser = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          placeLat,
          placeLng
        );
      }

      visitedPlaces.push({
        placeName,
        placeId,
        imageUrl: placeImageUrl,
        rating: placeRating,
        address: placeAddress,
        location: {
          latitude: placeLat,
          longitude: placeLng,
        },
        directionsUrl,
        distance: distanceFromUser,
      });
    }

    return {
      visitedPlaces,
      totalPages,
    };
  } catch (error: any) {
    console.error('Error in getLocationVisitedPlaces:', error.message);
    throw new Error(`Failed to get location visited places: ${error.message}`);
  }
};

// Search for users and hashtags with pagination and metadata
const searchUsersHashtags = async (
  searchTerm: string
): Promise<UsersHashtagsResult> => {
  try {
    if (!searchTerm?.trim()) {
      throw new Error('Search term is required');
    }
    const userQuery = {
      $or: [{ fullName: { $regex: new RegExp(searchTerm, 'i') } }],
      role: { $nin: ['Admin', 'Super_Admin'] },
      isDeleted: false,
      isBanned: false,
    };

    const totalUsers = await User.countDocuments(userQuery);
    const users = await User.find(userQuery)
      .select('fullName username profileImage')
      .lean();

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
  } catch (error: any) {
    console.error('Error in searchUsersHashtags:', error.message);
    throw new Error(
      `Failed to search for users and hashtags: ${error.message}`
    );
  }
};

export const searchServices = {
  searchLocationPost,
  searchUsersHashtags,
  getLocationVisitedPlaces,
};
