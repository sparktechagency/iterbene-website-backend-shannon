import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SavedPostItineraryController } from './savedPostItinerary.controller';

const router = Router();

router
  .route('/')
  .post(auth('User'), SavedPostItineraryController.addPostItinerary)
  .get(auth('User'), SavedPostItineraryController.getSavedPostItinerary);

router
  .route('/id')
  .delete(auth('User'), SavedPostItineraryController.getSavedPostItinerary);

  export const SavedPostItineraryRoutes = router;
