import { Router } from 'express';
import { SavedPostItineraryController } from './savedPostItinerary.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.get(
  '/already-saved/:postId',
  auth('Common'),
  SavedPostItineraryController.isPostAlreadySaved
);
router
  .route('/')
  .post( auth('Common'), SavedPostItineraryController.addPostSaved)
  .get( auth('Common'), SavedPostItineraryController.getSavedPost);

router
  .route('/:postId')
  .delete( auth('Common'), SavedPostItineraryController.removePostSaved);

export const SavedPostItineraryRoutes = router;
