import express from 'express';
import { FollowerController } from './followers.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post('/follow', auth('User'), FollowerController.followUser);
router.post('/unfollow', auth('User'), FollowerController.unfollowUser);
router.get('/followers', auth('User'), FollowerController.getFollowers);
router.get('/following', auth('User'), FollowerController.getFollowing);

export const FollowerRoutes = router;
