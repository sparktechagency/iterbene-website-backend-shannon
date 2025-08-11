import { Router } from 'express';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../shared/fileUploadHandler';
import { ItineraryController } from './itinerary.controller';

const UPLOADS_FOLDER = 'uploads/itineraries';
const upload = fileUploadHandler(UPLOADS_FOLDER);
const router = Router();

router.route('/').post( auth('Common'), ItineraryController.createItinerary);

// pdf itinerary
router
  .route('/pdf')
  .post(
    auth('Common'),
    upload.single('itineraryPDF'),
    ItineraryController.createItineraryFromPDF
  );

router
  .route('/:itineraryId')
  .get( auth('Common'), ItineraryController.getItinerary)
  .patch( auth('Common'), ItineraryController.updateItinerary);

export const ItineraryRoutes = router;
