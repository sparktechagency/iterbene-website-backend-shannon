import express from 'express';
import auth from '../../middlewares/auth';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import fileUploadHandler from '../../shared/fileUploadHandler';
import validateRequest from '../../shared/validateRequest';
import { GroupInviteController } from '../groupInvite/groupInvite.controllers';
import { GroupController } from './group.controllers';
import { GroupValidation } from './group.validation';
const GROUP_UPLOADS_FOLDER = 'uploads/groups';
const upload = fileUploadHandler(GROUP_UPLOADS_FOLDER);

const router = express.Router();

// Create a group (any authenticated user)
router.post(
  '/',
  auth('Common'),
  upload.single('groupImage'),
  convertHeicToPngMiddleware(GROUP_UPLOADS_FOLDER),
  // validateRequest(GroupValidation.createGroupValidationSchema),
  GroupController.createGroup
);

// Join a group (members only)
router.post(
  '/join',
  auth('Common'),
  validateRequest(GroupValidation.joinGroupValidationSchema),
  GroupController.joinGroup
);

// Leave a group (members only)
router.post(
  '/leave',
  auth('Common'),
  validateRequest(GroupValidation.leaveGroupValidationSchema),
  GroupController.leaveGroup
);

// Approve join request (admin only)
router.post(
  '/approve-join',
  auth('Common'),
  validateRequest(GroupValidation.approveJoinValidationSchema),
  GroupController.approveJoinRequest
);

// Reject join request (admin only)
router.post(
  '/reject-join',
  auth('Common'),
  validateRequest(GroupValidation.rejectJoinValidationSchema),
  GroupController.rejectJoinRequest
);

// Remove a member (admin only)
router.post(
  '/remove-member',
  auth('Common'),
  validateRequest(GroupValidation.removeMemberValidationSchema),
  GroupController.removeMember
);

// Promote member to admin (admin only)
router.post(
  '/promote-admin',
  auth('Common'),
  validateRequest(GroupValidation.promoteAdminValidationSchema),
  GroupController.promoteToAdmin
);

// Demote admin (admin only, creator-specific in service)
router.post(
  '/demote-admin',
  auth('Common'),
  validateRequest(GroupValidation.demoteAdminValidationSchema),
  GroupController.demoteAdmin
);

// Promote member to co-leader (admin only)
router.post(
  '/promote-co-leader',
  auth('Common'),
  validateRequest(GroupValidation.promoteCoLeaderValidationSchema),
  GroupController.promoteToCoLeader
);

// Demote co-leader (admin only)
router.post(
  '/demote-co-leader',
  auth('Common'),
  validateRequest(GroupValidation.demoteCoLeaderValidationSchema),
  GroupController.demoteCoLeader
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

router
  .route('/:id')
  .get(
    auth('Common'),
    validateRequest(GroupValidation.getGroupValidationSchema),
    GroupController.getGroup
  )
  .patch(
    auth('Common'),
    validateRequest(GroupValidation.updateGroupValidationSchema),
    GroupController.updateGroup
  )
  .delete(
    auth('Common'),
    validateRequest(GroupValidation.deleteGroupValidationSchema),
    GroupController.deleteGroup
  );

export const GroupRoutes = router;
