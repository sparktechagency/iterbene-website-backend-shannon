import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SavedPostItineraryController } from './savedPostItinerary.controller';

const router = Router();

router.get(
  '/already-saved/:postItineraryId',
  auth('User'),
  SavedPostItineraryController.isPostItineraryAlreadySaved
);
router
  .route('/')
  .post(auth('User'), SavedPostItineraryController.addPostItinerary)
  .get(auth('User'), SavedPostItineraryController.getSavedPostItinerary);

router
  .route('/:postItineraryId')
  .delete(auth('User'), SavedPostItineraryController.removePostItinerary);

export const SavedPostItineraryRoutes = router;
