import express from 'express';
import auth from '../../middlewares/auth'; // Authentication middleware
import { GroupController } from './group.controllers';

const router = express.Router();

// Create a new travel group (accessible to all authenticated users)
router.post('/', auth('Common'), GroupController.createGroup);

// Join a travel group (accessible to all authenticated users)
router.post('/:groupId/join', auth('Common'), GroupController.joinGroup);

// Approve a join request for a private travel group (admin only)
router.patch(
  '/:groupId/approve/:userId',
  auth('Common'),
  GroupController.approveJoinRequest
);

// Send an invitation to join a travel group (accessible to all authenticated members)
router.post('/invite', auth('Common'), GroupController.sendGroupInvite);

// Accept a group invitation (accessible to all authenticated users)
router.patch(
  '/invite/:inviteId/accept',
  auth('Common'),
  GroupController.acceptGroupInvite
);

// Decline a group invitation (accessible to all authenticated users)
router.patch(
  '/invite/:inviteId/decline',
  auth('Common'),
  GroupController.declineGroupInvite
);

// Add co-leaders to a travel group (admin only)
router.patch(
  '/:groupId/co-leaders',
  auth('Common'),
  GroupController.addCoLeadersInGroup
);

// Leave a travel group (accessible to all authenticated users)
router.patch('/:groupId/leave', auth('Common'), GroupController.leaveGroup);

// Delete a travel group (admin only, restricted to creator)
router.delete('/:groupId', auth('Common'), GroupController.deleteGroup);

// Get a travel group's details (accessible to all authenticated users)
router.get('/:groupId', auth('Common'), GroupController.getGroup);

export const GroupRoutes = router;
