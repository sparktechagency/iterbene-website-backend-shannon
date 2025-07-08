import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { searchServices } from './search.services';

const searchLocationPost = catchAsync(async (req, res) => {
  const { searchTerm, userId, page, limit } = req.query;

  // Validate required parameters
  if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
    return sendResponse(res, {
      code: StatusCodes.BAD_REQUEST,
      message: 'Search term is required and must be a non-empty string',
      data: null,
    });
  }

  const result = await searchServices.searchLocationPost(
    searchTerm,
    userId as string | undefined,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Search results retrieved successfully',
    data: result,
  });
});

const searchUsersHashtags = catchAsync(async (req, res) => {
  const { searchTerm, page, limit } = req.query;

  // Validate required parameters
  if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
    return sendResponse(res, {
      code: StatusCodes.BAD_REQUEST,
      message: 'Search term is required and must be a non-empty string',
      data: null,
    });
  }

  const result = await searchServices.searchUsersHashtags(
    searchTerm,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Search results retrieved successfully',
    data: result,
  });
});

const getLocationVisitedPlaces = catchAsync(async (req, res) => {
  const { locationName, locationId, userId, radius, page, limit } = req.query;

  // Validate required parameters
  if (!locationName || typeof locationName !== 'string' || !locationName.trim()) {
    return sendResponse(res, {
      code: StatusCodes.BAD_REQUEST,
      message: 'Location name is required and must be a non-empty string',
      data: null,
    });
  }
  if (!locationId || typeof locationId !== 'string' || !locationId.trim()) {
    return sendResponse(res, {
      code: StatusCodes.BAD_REQUEST,
      message: 'Location ID is required and must be a non-empty string',
      data: null,
    });
  }

  const result = await searchServices.getLocationVisitedPlaces(
    locationName,
    locationId,
    userId as string | undefined,
    radius ? parseInt(radius as string) : 50000,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Visited places retrieved successfully',
    data: result,
  });
});

export const SearchController = {
  searchLocationPost,
  searchUsersHashtags,
  getLocationVisitedPlaces,
};