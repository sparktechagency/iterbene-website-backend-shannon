import express from 'express';
import { BlockedUserController } from './blockedUsers.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post(
  '/block/:blockedId',
  auth('Common'),
  BlockedUserController.blockUser
);
router.post(
  '/unblock/:blockedId',
  auth('Common'),
  BlockedUserController.unblockUser
);
router.get(
  '/my-block-users',
  auth('Common'),
  BlockedUserController.getBlockedUsers
);

export const BlockedUserRoutes = router;
