import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ItineraryController } from './itinerary.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';

const UPLOADS_FOLDER = 'uploads/itineraries';
const upload = fileUploadHandler(UPLOADS_FOLDER);
const router = Router();

router.route('/').post(auth('User'), ItineraryController.createItinerary);

// pdf itinerary
router
  .route('/pdf')
  .post(
    auth('User'),
    upload.single('itineraryPDF'),
    ItineraryController.createItineraryFromPDF
  );

router
  .route('/:itineraryId')
  .get(auth('User'), ItineraryController.getItinerary)
  .patch(auth('User'), ItineraryController.updateItinerary);

export const ItineraryRoutes = router;
