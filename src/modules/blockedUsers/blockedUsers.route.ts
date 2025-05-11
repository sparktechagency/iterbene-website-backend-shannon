import express from 'express';
import { BlockedUserController } from './blockedUsers.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post('/block', auth('User'), BlockedUserController.blockUser);
router.post('/unblock', auth('User'), BlockedUserController.unblockUser);
router.get('/blocked', auth('User'), BlockedUserController.getBlockedUsers);

export const BlockedUserRoutes = router;
