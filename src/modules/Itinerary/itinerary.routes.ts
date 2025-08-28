import { Router } from 'express';
import fileUploadHandler from '../../shared/fileUploadHandler';
import { ItineraryController } from './itinerary.controller';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import { fullAuth } from '../../middlewares/smartAuth';

const ITINERARY_UPLOADS_FOLDER = 'uploads/itineraries';
const upload = fileUploadHandler(ITINERARY_UPLOADS_FOLDER);
const router = Router();

router.route('/').post(fullAuth('Common'), ItineraryController.createItinerary);

// pdf itinerary
router
  .route('/pdf')
  .post(
    fullAuth('Common'),
    upload.single('itineraryPDF'),
    convertHeicToPngMiddleware(ITINERARY_UPLOADS_FOLDER),
    ItineraryController.createItineraryFromPDF
  );

router
  .route('/:itineraryId')
  .get(fullAuth('Common'), ItineraryController.getItinerary)
  .patch(fullAuth('Common'), ItineraryController.updateItinerary);

export const ItineraryRoutes = router;
