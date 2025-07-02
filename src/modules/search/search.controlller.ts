import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { searchServices } from './search.services';

const searchLocationPost = catchAsync(async (req, res) => {
  const { searchTerm } = req.query;
  const result = await searchServices.searchLocationPost(searchTerm as string);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Search results retrieved successfully',
    data: result,
  });
});
const searchUsersHashtags = catchAsync(async (req, res) => {
  const { searchTerm } = req.query;
  const result = await searchServices.searchUsersHashtags(searchTerm as string);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Search results retrieved successfully',
    data: result,
  });
});

export const SearchController = {
  searchUsersHashtags,
  searchLocationPost
};
