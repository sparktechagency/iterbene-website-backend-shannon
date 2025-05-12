import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ItineraryController } from './itinerary.controller';

const router = Router();

router.route('/').post(auth('User'), ItineraryController.createItinerary);

router
    .route('/:itineraryId')
    .get(auth('User'), ItineraryController.getItinerary)

export const ItineraryRoutes = router;
