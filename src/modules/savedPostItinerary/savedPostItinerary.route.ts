import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SavedPostItineraryController } from './savedPostItinerary.controller';

const router = Router();

router.get(
  '/already-saved/:postId',
  auth('Common'),
  SavedPostItineraryController.isPostAlreadySaved
);
router
  .route('/')
  .post(auth('User'), SavedPostItineraryController.addPostSaved)
  .get(auth('User'), SavedPostItineraryController.getSavedPost);

router
  .route('/:postId')
  .delete(auth('User'), SavedPostItineraryController.removePostSaved);

export const SavedPostItineraryRoutes = router;
