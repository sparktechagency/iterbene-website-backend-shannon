import { Router } from 'express';
import auth from '../../middlewares/auth';
import { PostController } from './post.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';
import validateRequest from '../../shared/validateRequest';
import { PostValidation } from './post.validation';
const UPLOADS_FOLDER = 'uploads/posts';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();

router
  .route('/')
  .post(
    auth('User'),
    upload.array('postFiles', 10),
    validateRequest(PostValidation.createPostValidationSchema),
    PostController.createPost
  );

router.post('/share', auth('User'), PostController.sharePost);
router.get('/feed', PostController.feedPosts);
//get single user timeline posts
router.get('/user-timeline/:username', auth('Common'), PostController.getUserTimelinePosts);
router.get('/group/:groupId', auth('Common'), PostController.getGroupPosts);
router.get('/event/:eventId', auth('Common'), PostController.getEventPosts);

// Reaction routes
router.post('/reaction', auth('User'), PostController.addOrRemoveReaction);

// Comment routes
router.post('/comment', auth('User'), PostController.createComment);
router.patch('/comment/:commentId', auth('User'), PostController.updateComment);
router.delete(
  '/comment/:commentId',
  auth('User'),
  PostController.deleteComment
);

export const PostRoutes = router;
