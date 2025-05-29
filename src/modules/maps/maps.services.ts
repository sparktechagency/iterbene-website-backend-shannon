import { config } from '../../config';
import { User } from '../user/user.model';
import { Maps } from './maps.model';

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = config.googleMapsApiKey;

// Distance calculation using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles (use 6371 for kilometers)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Generate Google Maps Static Image URL
const generateMapImageUrl = (latitude: number, longitude: number, zoom: number = 15, size: string = '400x400'): string => {
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: zoom.toString(),
    size: size,
    maptype: 'roadmap',
    markers: `color:red|${latitude},${longitude}`,
    key: GOOGLE_MAPS_API_KEY || ''
  });
  
  return `${baseUrl}?${params.toString()}`;
};

// Enhanced myMaps function with distance and images
const myMaps = async (userId: string) => {
  const user = await User.findById(userId);
  const myMapsData = await Maps.findOne({ userId: user?._id });
  const userCurrentLocation = user?.location;

  if (!userCurrentLocation) {
    throw new Error('User current location not found');
  }

  // Process interested locations with distance and images
  const interestedLocationsWithDetails = myMapsData?.interestedLocation?.map((location: any) => {
    const distance = calculateDistance(
      userCurrentLocation.latitude as number,
      userCurrentLocation.longitude as number,
      location.latitude,
      location.longitude
    );

    const imageUrl = generateMapImageUrl(location.latitude, location.longitude);

    return {
      ...location.toObject(),
      distanceFromCurrentLocation: `${distance} miles`,
      mapImageUrl: imageUrl,
      googleMapsUrl: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    };
  }) || [];

  // Process visited locations with distance and images
  const visitedLocationsWithDetails = myMapsData?.visitedLocation?.map((location: any) => {
    const distance = calculateDistance(
      userCurrentLocation.latitude as number,
      userCurrentLocation.longitude as number,
      location.latitude,
      location.longitude
    );

    const imageUrl = generateMapImageUrl(location.latitude, location.longitude);

    return {
      ...location.toObject(),
      distanceFromCurrentLocation: `${distance} miles`,
      mapImageUrl: imageUrl,
      googleMapsUrl: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    };
  }) || [];

  const result = {
    myCurrentLocation: {
      ...userCurrentLocation,
      mapImageUrl: generateMapImageUrl(userCurrentLocation.latitude as number, userCurrentLocation.longitude as number)
    },
    interestedLocations: interestedLocationsWithDetails,
    visitedLocations: visitedLocationsWithDetails,
  };

  return result;
};

// Get location details with multiple image sizes
const getLocationImages = (latitude: number, longitude: number) => {
  return {
    thumbnail: generateMapImageUrl(latitude, longitude, 12, '200x200'),
    medium: generateMapImageUrl(latitude, longitude, 15, '400x400'),
    large: generateMapImageUrl(latitude, longitude, 16, '800x600'),
    satellite: `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=400x400&maptype=satellite&key=${GOOGLE_MAPS_API_KEY}`
  };
};

// Get distance between two locations
const getDistanceBetweenLocations = (
  lat1: number, lon1: number, 
  lat2: number, lon2: number, 
  unit: 'miles' | 'km' = 'miles'
) => {
  let distance = calculateDistance(lat1, lon1, lat2, lon2);
  
  if (unit === 'km') {
    distance = distance * 1.60934; // Convert miles to kilometers
  }
  
  return {
    distance: Math.round(distance * 100) / 100,
    unit: unit
  };
};

// Get nearby places using Google Places API
const getNearbyPlaces = async (latitude: number, longitude: number, radius: number = 5000, type?: string) => {
  try {
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: radius.toString(),
      key: GOOGLE_MAPS_API_KEY || ''
    });

    if (type) {
      params.append('type', type);
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();
    
    return data.results?.map((place: any) => ({
      name: place.name,
      rating: place.rating,
      vicinity: place.vicinity,
      types: place.types,
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng
      },
      photoUrl: place.photos?.[0] ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}` 
        : null
    }));
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
};

export const MapsService = {
  myMaps,
  getLocationImages,
  getDistanceBetweenLocations,
  getNearbyPlaces,
  calculateDistance,
  generateMapImageUrl
};