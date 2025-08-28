import { Router } from 'express';
import { SavedPostItineraryController } from './savedPostItinerary.controller';
import { fullAuth } from '../../middlewares/smartAuth';

const router = Router();

router.get(
  '/already-saved/:postId',
  fullAuth('Common'),
  SavedPostItineraryController.isPostAlreadySaved
);
router
  .route('/')
  .post( fullAuth('Common'), SavedPostItineraryController.addPostSaved)
  .get( fullAuth('Common'), SavedPostItineraryController.getSavedPost);

router
  .route('/:postId')
  .delete( fullAuth('Common'), SavedPostItineraryController.removePostSaved);

export const SavedPostItineraryRoutes = router;
