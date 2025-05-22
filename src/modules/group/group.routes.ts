import express from 'express';
import { GroupValidation } from './group.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { GroupController } from './group.controllers';
import { GroupInviteController } from '../groupInvite/groupInvite.controllers';
import fileUploadHandler from '../../shared/fileUploadHandler';
const UPLOADS_FOLDER = 'uploads/groups';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = express.Router();

// Create a group (any authenticated user)
router.post(
  '/',
  auth('User'),
  upload.single('groupImage'),
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
  auth('User'),
  validateRequest(GroupValidation.approveJoinValidationSchema),
  GroupController.approveJoinRequest
);

// Reject join request (admin only)
router.post(
  '/reject-join',
  auth('User'),
  validateRequest(GroupValidation.rejectJoinValidationSchema),
  GroupController.rejectJoinRequest
);

// Remove a member (admin only)
router.post(
  '/remove-member',
  auth('User'),
  validateRequest(GroupValidation.removeMemberValidationSchema),
  GroupController.removeMember
);

// Promote member to admin (admin only)
router.post(
  '/promote-admin',
  auth('User'),
  validateRequest(GroupValidation.promoteAdminValidationSchema),
  GroupController.promoteToAdmin
);

// Demote admin (admin only, creator-specific in service)
router.post(
  '/demote-admin',
  auth('User'),
  validateRequest(GroupValidation.demoteAdminValidationSchema),
  GroupController.demoteAdmin
);

// Promote member to co-leader (admin only)
router.post(
  '/promote-co-leader',
  auth('User'),
  validateRequest(GroupValidation.promoteCoLeaderValidationSchema),
  GroupController.promoteToCoLeader
);

// Demote co-leader (admin only)
router.post(
  '/demote-co-leader',
  auth('User'),
  validateRequest(GroupValidation.demoteCoLeaderValidationSchema),
  GroupController.demoteCoLeader
);

// Get my groups (any authenticated user)
router.get('/my-groups', auth('User'), GroupController.getMyGroups);

// Get my joined or pending groups (any authenticated user)
router.get('/my-join-groups', auth('User'), GroupController.getMyJoinGroups);

// Get group suggestions (any authenticated user)
router.get('/suggestions', auth('User'), GroupController.getGroupSuggestions);

// Group Invite Routes

// Send group invite (any authenticated user, member/admin in service)
router.post(
  '/invites/send',
  auth('User'),
  validateRequest(GroupValidation.sendInviteValidationSchema),
  GroupInviteController.sendInvite
);

// Accept group invite (any authenticated user)
router.post(
  '/invites/accept',
  auth('User'),
  validateRequest(GroupValidation.acceptInviteValidationSchema),
  GroupInviteController.acceptInvite
);

// Decline group invite (any authenticated user)
router.post(
  '/invites/decline',
  auth('User'),
  validateRequest(GroupValidation.declineInviteValidationSchema),
  GroupInviteController.declineInvite
);

// Cancel group invite (any authenticated user, sender/admin in service)
router.post(
  '/invites/cancel',
  auth('User'),
  validateRequest(GroupValidation.cancelInviteValidationSchema),
  GroupInviteController.cancelInvite
);

// Get my group invites (any authenticated user)
router.get(
  '/invites/my-invites',
  auth('User'),
  GroupInviteController.getMyInvites
);

router
  .route('/:id')
  .get(
    auth('User'),
    validateRequest(GroupValidation.getGroupValidationSchema),
    GroupController.getGroup
  )
  .patch(
    auth('User'),
    validateRequest(GroupValidation.updateGroupValidationSchema),
    GroupController.updateGroup
  )
  .delete(
    auth('User'),
    validateRequest(GroupValidation.deleteGroupValidationSchema),
    GroupController.deleteGroup
  );

export const GroupRoutes = router;
