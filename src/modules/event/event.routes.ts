import express from 'express';
import fileUploadHandler from '../../shared/fileUploadHandler';
import validateRequest from '../../shared/validateRequest';
import { EventInviteController } from '../eventInvite/eventInvite.controller';
import { EVENT_UPLOADS_FOLDER } from './event.constant';
import { EventController } from './event.controllers';
import { EventValidation } from './event.validations';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import { fullAuth } from '../../middlewares/smartAuth';
const upload = fileUploadHandler(EVENT_UPLOADS_FOLDER);

const router = express.Router();

// Create an event (any fullAuthenticated user)
router.post(
  '/',
  fullAuth('Common'),
  upload.single('eventImage'),
  convertHeicToPngMiddleware(EVENT_UPLOADS_FOLDER),
  validateRequest(EventValidation.createEventValidationSchema),
  EventController.createEvent
);

// interest an event (any fullAuthenticated user)
router.post('/interest/:eventId', fullAuth('Common'), EventController.interestEvent);
// Leave an event (any fullAuthenticated user)
router.post(
  '/not-interest/:eventId',
  fullAuth('Common'),
  EventController.notInterestEvent
);

// Get my events (any fullAuthenticated user)
router.get('/my-events', fullAuth('Common'), EventController.getMyEvents);

// Get my interested events (any fullAuthenticated user)
router.get(
  '/my-interested-events',
  fullAuth('Common'),
  EventController.getMyInterestedEvents
);

// Get event suggestions (any fullAuthenticated user)
router.get('/suggestions', EventController.getEventSuggestions);

// Event Invite Routes

// Send event invite (any fullAuthenticated user, interested user/co-host in service)
router.post(
  '/invites/send',
  fullAuth('Common'),
  validateRequest(EventValidation.sendInviteValidationSchema),
  EventInviteController.sendInvite
);

// Accept event invite (any fullAuthenticated user)
router.post(
  '/invites/accept',
  fullAuth('Common'),
  validateRequest(EventValidation.acceptInviteValidationSchema),
  EventInviteController.acceptInvite
);

// Decline event invite (any fullAuthenticated user)
router.post(
  '/invites/decline',
  fullAuth('Common'),
  validateRequest(EventValidation.declineInviteValidationSchema),
  EventInviteController.declineInvite
);
router.get(
  '/invites/my-invites',
  fullAuth('Common'),
  EventInviteController.getMyInvites
);

// Cancel event invite (any fullAuthenticated user, sender/co-host in service)
router.post(
  '/invites/cancel',
  fullAuth('Common'),
  validateRequest(EventValidation.cancelInviteValidationSchema),
  EventInviteController.cancelInvite
);

// Get my event invites (any fullAuthenticated user)
router.get(
  '/invites/my-invites',
  fullAuth('Common'),
  EventInviteController.getMyInvites
);

// Get event details (any fullAuthenticated user)

router
  .route('/:id')
  .get(
    fullAuth('Common'),
    validateRequest(EventValidation.getEventValidationSchema),
    EventController.getEvent
  )
  .delete(
    fullAuth('Common'),
    validateRequest(EventValidation.deleteEventValidationSchema),
    EventController.deleteEvent
  );

export const EventRoutes = router;
