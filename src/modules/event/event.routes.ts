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

// Join an event (any authenticated user)
router.post(
  '/join',
  auth('User'),
  validateRequest(EventValidation.joinEventValidationSchema),
  EventController.joinEvent
);

// Leave an event (any authenticated user)
router.post(
  '/leave',
  auth('User'),
  validateRequest(EventValidation.leaveEventValidationSchema),
  EventController.leaveEvent
);

//approve join event (admin only)
router.post(
  '/approve-join',
  auth('User'),
  validateRequest(EventValidation.approveJoinValidationSchema),
  EventController.approveJoinEvent
);
//reject join event (admin only)
router.post(
  '/reject-join',
  auth('User'),
  validateRequest(EventValidation.rejectJoinValidationSchema),
  EventController.rejectJoinEvent
);

// Remove a user (co-host only)
router.post(
  '/remove-user',
  auth('User'),
  validateRequest(EventValidation.removeUserValidationSchema),
  EventController.removeUser
);

// Promote user to co-host (co-host only)
router.post(
  '/promote-co-host',
  auth('User'),
  validateRequest(EventValidation.promoteCoHostValidationSchema),
  EventController.promoteToCoHost
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

// Demote co-host (creator only, enforced in service)
router.post(
  '/demote-co-host',
  auth('User'),
  validateRequest(EventValidation.demoteCoHostValidationSchema),
  EventController.demoteCoHost
);

// Get event details (any authenticated user)

router
  .route('/:id')
  .get(
    auth('Common'),
    validateRequest(EventValidation.getEventValidationSchema),
    EventController.getEvent
  )
  .patch(
    auth('User'),
    validateRequest(EventValidation.updateEventValidationSchema),
    EventController.updateEvent
  )
  .delete(
    auth('Common'),
    validateRequest(EventValidation.deleteEventValidationSchema),
    EventController.deleteEvent
  );

export const EventRoutes = router;
