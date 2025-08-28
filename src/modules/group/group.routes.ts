import express from 'express';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import fileUploadHandler from '../../shared/fileUploadHandler';
import validateRequest from '../../shared/validateRequest';
import { GroupInviteController } from '../groupInvite/groupInvite.controllers';
import { GroupController } from './group.controllers';
import { GroupValidation } from './group.validation';
import { fullAuth } from '../../middlewares/smartAuth';
const GROUP_UPLOADS_FOLDER = 'uploads/groups';
const upload = fileUploadHandler(GROUP_UPLOADS_FOLDER);

const router = express.Router();

// Create a group (any authenticated user)
router.post(
  '/',
  fullAuth('Common'),
  upload.single('groupImage'),
  convertHeicToPngMiddleware(GROUP_UPLOADS_FOLDER),
  // validateRequest(GroupValidation.createGroupValidationSchema),
  GroupController.createGroup
);

// Join a group (members only)
router.post(
  '/join',
  fullAuth('Common'),
  validateRequest(GroupValidation.joinGroupValidationSchema),
  GroupController.joinGroup
);

// Leave a group (members only)
router.post(
  '/leave',
  fullAuth('Common'),
  validateRequest(GroupValidation.leaveGroupValidationSchema),
  GroupController.leaveGroup
);

// Approve join request (admin only)
router.post(
  '/approve-join',
  fullAuth('Common'),
  validateRequest(GroupValidation.approveJoinValidationSchema),
  GroupController.approveJoinRequest
);

// Reject join request (admin only)
router.post(
  '/reject-join',
  fullAuth('Common'),
  validateRequest(GroupValidation.rejectJoinValidationSchema),
  GroupController.rejectJoinRequest
);

// Remove a member (admin only)
router.post(
  '/remove-member',
  fullAuth('Common'),
  validateRequest(GroupValidation.removeMemberValidationSchema),
  GroupController.removeMember
);

// Promote member to admin (admin only)
router.post(
  '/promote-admin',
  fullAuth('Common'),
  validateRequest(GroupValidation.promoteAdminValidationSchema),
  GroupController.promoteToAdmin
);

// Demote admin (admin only, creator-specific in service)
router.post(
  '/demote-admin',
  fullAuth('Common'),
  validateRequest(GroupValidation.demoteAdminValidationSchema),
  GroupController.demoteAdmin
);

// Promote member to co-leader (admin only)
router.post(
  '/promote-co-leader',
  fullAuth('Common'),
  validateRequest(GroupValidation.promoteCoLeaderValidationSchema),
  GroupController.promoteToCoLeader
);

// Demote co-leader (admin only)
router.post(
  '/demote-co-leader',
  fullAuth('Common'),
  validateRequest(GroupValidation.demoteCoLeaderValidationSchema),
  GroupController.demoteCoLeader
);

// Get my groups (any fullAuthenticated user)
router.get('/my-groups', fullAuth('Common'), GroupController.getMyGroups);

// Get my joined or pending groups (any fullAuthenticated user)
router.get('/my-join-groups', fullAuth('Common'), GroupController.getMyJoinGroups);

// Get group suggestions (any fullAuthenticated user)
router.get('/suggestions', fullAuth('Common'), GroupController.getGroupSuggestions);

// Group Invite Routes

// Send group invite (any fullAuthenticated user, member/admin in service)
router.post(
  '/invites/send',
  fullAuth('Common'),
  validateRequest(GroupValidation.sendInviteValidationSchema),
  GroupInviteController.sendInvite
);

// Accept group invite (any fullAuthenticated user)
router.post(
  '/invites/accept',
  fullAuth('Common'),
  validateRequest(GroupValidation.acceptInviteValidationSchema),
  GroupInviteController.acceptInvite
);

// Decline group invite (any fullAuthenticated user)
router.post(
  '/invites/decline',
  fullAuth('Common'),
  validateRequest(GroupValidation.declineInviteValidationSchema),
  GroupInviteController.declineInvite
);

// Cancel group invite (any fullAuthenticated user, sender/admin in service)
router.post(
  '/invites/cancel',
  fullAuth('Common'),
  validateRequest(GroupValidation.cancelInviteValidationSchema),
  GroupInviteController.cancelInvite
);

// Get my group invites (any fullAuthenticated user)
router.get(
  '/invites/my-invites',
  fullAuth('Common'),
  GroupInviteController.getMyInvites
);

router
  .route('/:id')
  .get(
    fullAuth('Common'),
    validateRequest(GroupValidation.getGroupValidationSchema),
    GroupController.getGroup
  )
  .patch(
    fullAuth('Common'),
    validateRequest(GroupValidation.updateGroupValidationSchema),
    GroupController.updateGroup
  )
  .delete(
    fullAuth('Common'),
    validateRequest(GroupValidation.deleteGroupValidationSchema),
    GroupController.deleteGroup
  );

export const GroupRoutes = router;
