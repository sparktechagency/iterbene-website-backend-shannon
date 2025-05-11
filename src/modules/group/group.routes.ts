import express from 'express';
import { GroupValidation } from './group.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { GroupController } from './group.controllers';
import { GroupInviteController } from '../groupInvite/groupInvite.controllers';

const router = express.Router();

// Group Routes

// Create a group (any authenticated user)
router.post(
  '/',
  auth('Common'),
  validateRequest(GroupValidation.createGroupValidationSchema),
  GroupController.createGroup
);

// Join a group (members only)
router.post(
  '/join',
  auth('User'),
  validateRequest(GroupValidation.joinGroupValidationSchema),
  GroupController.joinGroup
);

// Leave a group (members only)
router.post(
  '/leave',
  auth('User'),
  validateRequest(GroupValidation.leaveGroupValidationSchema),
  GroupController.leaveGroup
);

// Approve join request (admin only)
router.post(
  '/approve-join',
  auth('Admin'),
  validateRequest(GroupValidation.approveJoinValidationSchema),
  GroupController.approveJoinRequest
);

// Reject join request (admin only)
router.post(
  '/reject-join',
  auth('Admin'),
  validateRequest(GroupValidation.rejectJoinValidationSchema),
  GroupController.rejectJoinRequest
);

// Remove a member (admin only)
router.post(
  '/remove-member',
  auth('Admin'),
  validateRequest(GroupValidation.removeMemberValidationSchema),
  GroupController.removeMember
);

// Promote member to admin (admin only)
router.post(
  '/promote-admin',
  auth('Admin'),
  validateRequest(GroupValidation.promoteAdminValidationSchema),
  GroupController.promoteToAdmin
);

// Demote admin (admin only, creator-specific in service)
router.post(
  '/demote-admin',
  auth('Admin'),
  validateRequest(GroupValidation.demoteAdminValidationSchema),
  GroupController.demoteAdmin
);

// Promote member to co-leader (admin only)
router.post(
  '/promote-co-leader',
  auth('Admin'),
  validateRequest(GroupValidation.promoteCoLeaderValidationSchema),
  GroupController.promoteToCoLeader
);

// Demote co-leader (admin only)
router.post(
  '/demote-co-leader',
  auth('Admin'),
  validateRequest(GroupValidation.demoteCoLeaderValidationSchema),
  GroupController.demoteCoLeader
);

// Update group (admin only)
router.patch(
  '/:id',
  auth('Admin'),
  validateRequest(GroupValidation.updateGroupValidationSchema),
  GroupController.updateGroup
);

// Delete group (any authenticated user, creator-specific in service)
router.delete(
  '/:id',
  auth('Common'),
  validateRequest(GroupValidation.deleteGroupValidationSchema),
  GroupController.deleteGroup
);

// Get my groups (any authenticated user)
router.get('/my-groups', auth('Common'), GroupController.getMyGroups);

// Get my joined or pending groups (any authenticated user)
router.get('/my-join-groups', auth('Common'), GroupController.getMyJoinGroups);

// Get group suggestions (any authenticated user)
router.get('/suggestions', auth('Common'), GroupController.getGroupSuggestions);

// Group Invite Routes

// Send group invite (any authenticated user, member/admin in service)
router.post(
  '/invites/send',
  auth('Common'),
  validateRequest(GroupValidation.sendInviteValidationSchema),
  GroupInviteController.sendInvite
);

// Accept group invite (any authenticated user)
router.post(
  '/invites/accept',
  auth('Common'),
  validateRequest(GroupValidation.acceptInviteValidationSchema),
  GroupInviteController.acceptInvite
);

// Decline group invite (any authenticated user)
router.post(
  '/invites/decline',
  auth('Common'),
  validateRequest(GroupValidation.declineInviteValidationSchema),
  GroupInviteController.declineInvite
);

// Cancel group invite (any authenticated user, sender/admin in service)
router.post(
  '/invites/cancel',
  auth('Common'),
  validateRequest(GroupValidation.cancelInviteValidationSchema),
  GroupInviteController.cancelInvite
);

// Get my group invites (any authenticated user)
router.get(
  '/invites/my-invites',
  auth('Common'),
  GroupInviteController.getMyInvites
);

export const GroupRoutes = router;
