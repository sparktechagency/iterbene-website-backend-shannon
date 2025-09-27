import { Router } from 'express';
import fileUploadHandler from '../../shared/fileUploadHandler';
import { ItineraryController } from './itinerary.controller';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import auth from '../../middlewares/auth';
import { ITINERARY_UPLOADS_FOLDER } from './itinerary.constant';
const upload = fileUploadHandler(ITINERARY_UPLOADS_FOLDER);
const router = Router();

router.route('/').post(auth('Common'), ItineraryController.createItinerary);

// pdf itinerary
router
  .route('/pdf')
  .post(
    auth('Common'),
    upload.single('pdf'),
    convertHeicToPngMiddleware(ITINERARY_UPLOADS_FOLDER),
    ItineraryController.createItineraryFromPDF
  );

router
  .route('/:itineraryId')
  .get(auth('Common'), ItineraryController.getItinerary)
  .patch(auth('Common'), ItineraryController.updateItinerary);

export const ItineraryRoutes = router;
