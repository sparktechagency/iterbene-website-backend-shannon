import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import { SavedPostItineraryService } from './savedPostItinerary.services';

const addPostItinerary = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { postItineraryId } = req.body;
  const result = await SavedPostItineraryService.addPostItinerary(
    userId,
    postItineraryId
  );
  res.status(201).json({
    status: 'success',
    message: 'Post itinerary saved successfully',
    data: result,
  });
});

const getSavedPostItinerary = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['userId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await SavedPostItineraryService.getSavedPostItinerary(
    filters,
    options
  );
  res.status(201).json({
    status: 'success',
    message: 'Post itinerary saved successfully',
    data: result,
  });
});

const removePostItinerary = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { postItineraryId } = req.params;
  const result = await SavedPostItineraryService.removePostItinerary(
    userId,
    postItineraryId
  );
  res.status(201).json({
    status: 'success',
    message: 'Post itinerary removed successfully',
    data: result,
  });
});

export const SavedPostItineraryController = {
  addPostItinerary,
  getSavedPostItinerary,
  removePostItinerary,
};
