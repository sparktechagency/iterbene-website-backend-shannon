import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { EventValidation } from './event.validations';
import { EventInviteController } from '../eventInvite/eventInvite.controller';
import { EventController } from './event.controllers';
import fileUploadHandler from '../../shared/fileUploadHandler';
import { EVENT_UPLOADS_FOLDER } from './event.constant';
const upload = fileUploadHandler(EVENT_UPLOADS_FOLDER);

const router = express.Router();

// Create an event (any authenticated user)
router.post(
  '/',
  auth('User'),
  upload.single('eventImage'),
  validateRequest(EventValidation.createEventValidationSchema),
  EventController.createEvent
);

// interest an event (any authenticated user)
router.post('/interest/:eventId', auth('User'), EventController.interestEvent);
// Leave an event (any authenticated user)
router.post(
  '/not-interest/:eventId',
  auth('User'),
  EventController.notInterestEvent
);

// Get my events (any authenticated user)
router.get('/my-events', auth('Common'), EventController.getMyEvents);

// Get my interested events (any authenticated user)
router.get(
  '/my-interested-events',
  auth('Common'),
  EventController.getMyInterestedEvents
);

// Get event suggestions (any authenticated user)
router.get('/suggestions', auth('Common'), EventController.getEventSuggestions);

// Event Invite Routes

// Send event invite (any authenticated user, interested user/co-host in service)
router.post(
  '/invites/send',
  auth('Common'),
  validateRequest(EventValidation.sendInviteValidationSchema),
  EventInviteController.sendInvite
);

// Accept event invite (any authenticated user)
router.post(
  '/invites/accept',
  auth('Common'),
  validateRequest(EventValidation.acceptInviteValidationSchema),
  EventInviteController.acceptInvite
);

// Decline event invite (any authenticated user)
router.post(
  '/invites/decline',
  auth('Common'),
  validateRequest(EventValidation.declineInviteValidationSchema),
  EventInviteController.declineInvite
);
router.get(
  '/invites/my-invites',
  auth('Common'),
  EventInviteController.getMyInvites
);

// Cancel event invite (any authenticated user, sender/co-host in service)
router.post(
  '/invites/cancel',
  auth('Common'),
  validateRequest(EventValidation.cancelInviteValidationSchema),
  EventInviteController.cancelInvite
);

// Get my event invites (any authenticated user)
router.get(
  '/invites/my-invites',
  auth('Common'),
  EventInviteController.getMyInvites
);

// Get event details (any authenticated user)

router
  .route('/:id')
  .get(
    auth('Common'),
    validateRequest(EventValidation.getEventValidationSchema),
    EventController.getEvent
  )
  .delete(
    auth('Common'),
    validateRequest(EventValidation.deleteEventValidationSchema),
    EventController.deleteEvent
  );

export const EventRoutes = router;
