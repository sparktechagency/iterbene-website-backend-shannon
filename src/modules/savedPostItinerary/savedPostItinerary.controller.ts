import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import { SavedPostItineraryService } from './savedPostItinerary.services';

const addPostSaved = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { postId } = req.body;
  const result = await SavedPostItineraryService.addPostSaved(
    userId,
    postId
  );
  res.status(201).json({
    status: 'success',
    message: 'Post itinerary saved successfully',
    data: result,
  });
});

const getSavedPost = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['userId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await SavedPostItineraryService.getSavedPost(
    filters,
    options
  );
  res.status(201).json({
    status: 'success',
    message: 'Post itinerary saved successfully',
    data: result,
  });
});

const isPostAlreadySaved = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { postId} = req.params;
  const result = await SavedPostItineraryService.isPostAlreadySaved(
    userId,
    postId
  );
  res.status(201).json({
    status: 'success',
    message: 'Post itinerary saved successfully',
    data: result,
  });
});

const removePostSaved = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { postId } = req.params;
  const result = await SavedPostItineraryService.removePostSaved(
    userId,
    postId
  );
  res.status(201).json({
    status: 'success',
    message: 'Post itinerary removed successfully',
    data: result,
  });
});

export const SavedPostItineraryController = {
  addPostSaved,
  getSavedPost,
  isPostAlreadySaved,
  removePostSaved
};
