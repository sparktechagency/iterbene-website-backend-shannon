import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { EventValidation } from './event.validations';
import { EventInviteController } from '../eventInvite/eventInvite.controller';
import { EventController } from './event.controllers';

const router = express.Router();

// Event Routes

// Create an event (any authenticated user)
router.post(
  '/',
  auth('Common'),
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

// Remove a user (co-host only)
router.post(
  '/remove-user',
  auth('Admin'),
  validateRequest(EventValidation.removeUserValidationSchema),
  EventController.removeUser
);

// Promote user to co-host (co-host only)
router.post(
  '/promote-co-host',
  auth('Admin'),
  validateRequest(EventValidation.promoteCoHostValidationSchema),
  EventController.promoteToCoHost
);

// Demote co-host (creator only, enforced in service)
router.post(
  '/demote-co-host',
  auth('Admin'),
  validateRequest(EventValidation.demoteCoHostValidationSchema),
  EventController.demoteCoHost
);

// Get event details (any authenticated user)
router.get(
  '/:id',
  auth('Common'),
  validateRequest(EventValidation.getEventValidationSchema),
  EventController.getEvent
);

// Update event (co-host only)
router.patch(
  '/:id',
  auth('Admin'),
  validateRequest(EventValidation.updateEventValidationSchema),
  EventController.updateEvent
);

// Delete event (creator only, enforced in service)
router.delete(
  '/:id',
  auth('Common'),
  validateRequest(EventValidation.deleteEventValidationSchema),
  EventController.deleteEvent
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

export const EventRoutes = router;
