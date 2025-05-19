import { Router } from 'express';
import auth from '../../middlewares/auth';
import { HashtagController } from './hashtag.controller';

const router = Router();

router
  .route('/')
  .get(auth('User'), HashtagController.getHashtags)

export const HashtagRoutes = router;
