import express from 'express';
import { BlockedUserController } from './blockedUsers.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post('/block/:blockedId', auth('User'), BlockedUserController.blockUser);
router.post(
  '/unblock/:blockedId',
  auth('User'),
  BlockedUserController.unblockUser
);
router.get(
  '/my-block-users',
  auth('User'),
  BlockedUserController.getBlockedUsers
);

export const BlockedUserRoutes = router;
