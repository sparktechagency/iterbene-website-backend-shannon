import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ItineraryController } from './itinerary.controller';

const router = Router();

router.route('/').post(auth('User'), ItineraryController.createItinerary);

export const ItineraryRoutes = router;
