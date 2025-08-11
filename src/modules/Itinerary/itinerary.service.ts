import { Types } from 'mongoose';
import { IItinerary } from './Itinerary.interface';
import { Itinerary } from './itinerary.model';
import ApiError from '../../errors/ApiError';
import * as fs from 'fs';
import pdfParse from 'pdf-parse';

interface ExtractedItineraryData {
  tripName: string;
  travelMode: string;
  departure: string;
  arrival: string;
  days: Array<{
    dayNumber: number;
    locationName: string;
    latitude: number;
    longitude: number;
    weather?: string;
    comment?: string;
    activities: Array<{
      time: string;
      description: string;
      link?: string;
      rating?: number;
      duration?: string;
      cost?: number;
    }>;
  }>;
}

const createItineraryFromPDF = async (
  userId: Types.ObjectId,
  filePath: string
): Promise<IItinerary> => {
  try {
    // Parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    // Extract data using regex and text processing
    const extractedData = extractItineraryData(text);

    // Validate extracted data
    if (
      !extractedData.tripName ||
      !extractedData.travelMode ||
      !extractedData.departure ||
      !extractedData.arrival ||
      !extractedData.days.length
    ) {
      throw new ApiError(400, 'Incomplete itinerary data extracted from PDF');
    }

    // Create itinerary
    const itineraryData: any = {
      ...extractedData,
      userId,
      postId: new Types.ObjectId(),
    };

    const itinerary = await Itinerary.create(itineraryData);
    return itinerary;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Error processing PDF`);
  }
};

// Helper function to extract itinerary data from PDF text
const extractItineraryData = (text: string): ExtractedItineraryData => {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line);
  const data: ExtractedItineraryData = {
    tripName: '',
    travelMode: '',
    departure: '',
    arrival: '',
    days: [],
  };

  let currentDay: ExtractedItineraryData['days'][0] | null = null;
  let currentActivity:
    | ExtractedItineraryData['days'][0]['activities'][0]
    | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract trip header
    if (line.includes('Travel Itinerary')) {
      data.tripName = lines[i + 1] || '';
      const locationLine = lines[i + 2] || '';
      const [departure, arrival] = locationLine.split(' | ');
      data.departure = departure || '';
      data.arrival = arrival || '';
      // Extract travel mode (assuming it appears in the trip header section)
      const travelModeMatch = lines
        .slice(i, i + 5)
        .join(' ')
        .match(/(plane|train|car|bus|walk|bicycle|boat)/i);
      data.travelMode = travelModeMatch ? travelModeMatch[0] : 'plane';
    }

    // Extract day information
    const dayMatch = line.match(/^Day (\d+): Arrive in (.+)/);
    if (dayMatch) {
      if (currentDay) {
        data.days.push(currentDay);
      }
      const [, dayNumber, locationName] = dayMatch;
      currentDay = {
        dayNumber: parseInt(dayNumber),
        locationName,
        latitude: 0, // Will be set later or default to 0
        longitude: 0, // Will be set later or default to 0
        activities: [],
      };

      // Check for weather or comment
      if (lines[i + 1]?.startsWith('Weather:')) {
        currentDay.weather = lines[i + 1].replace('Weather: ', '');
        i++;
      }
      continue;
    }

    // Extract activity information
    const timeMatch = line.match(/^(\d{1,2}:\d{2} (AM|PM))/);
    if (timeMatch && currentDay) {
      if (currentActivity) {
        currentDay.activities.push(currentActivity);
      }
      currentActivity = {
        time: timeMatch[0],
        description: lines[i + 1] || '',
      };

      // Check for additional activity details
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (nextLine.match(/^Link: (.+)/)) {
          currentActivity.link = nextLine.replace('Link: ', '');
          i = j;
        } else if (nextLine.match(/^\$\d+/)) {
          currentActivity.cost = parseFloat(nextLine.replace('$', ''));
          i = j;
        } else if (nextLine.includes('Duration:')) {
          currentActivity.duration = nextLine.replace('Duration: ', '');
          i = j;
        } else if (nextLine.includes('Rate:')) {
          const ratingMatch = nextLine.match(/Rate:.*?\((\d)\)/);
          if (ratingMatch) {
            currentActivity.rating = parseInt(ratingMatch[1]);
          }
          i = j;
        } else if (
          nextLine.match(/^Day \d+:/) ||
          nextLine.match(/^\d{1,2}:\d{2} (AM|PM)/)
        ) {
          break;
        }
      }
      continue;
    }
  }

  // Push the last activity and day
  if (currentActivity && currentDay) {
    currentDay.activities.push(currentActivity);
  }
  if (currentDay) {
    data.days.push(currentDay);
  }

  // Set default coordinates (you might want to add geocoding logic here)
  data.days.forEach(day => {
    day.latitude = day.latitude || 0;
    day.longitude = day.longitude || 0;
  });

  return data;
};
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
  return Itinerary.findOneAndUpdate({ _id: id }, payload, { new: true });
};

export const ItineraryService = {
  createItinerary,
  getItinerary,
  getUserItineraries,
  updateItinerary,
  createItineraryFromPDF,
};
