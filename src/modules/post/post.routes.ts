import { Router } from 'express';
import auth from '../../middlewares/auth';
import { PostController } from './post.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';
import validateRequest from '../../shared/validateRequest';
import { PostValidation } from './post.validation';

const UPLOADS_FOLDER = 'uploads/posts';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();

// create post
router
  .route('/')
  .post(
    auth('User'),
    upload.array('postFiles', 10),
    validateRequest(PostValidation.createPostValidationSchema),
    PostController.createPost
  );

// Share post
router.post(
  '/share',
  auth('User'),
  validateRequest(PostValidation.sharePostValidationSchema),
  PostController.sharePost
);

//get feed posts
router.get('/feed', PostController.feedPosts);

// get user timeline post
router.get(
  '/user-timeline/:username',
  auth('Common'),
  PostController.getUserTimelinePosts
);
// get group timeline post
router.get('/group/:groupId', auth('Common'), PostController.getGroupPosts);

// get event timeline post
router.get('/event/:eventId', auth('Common'), PostController.getEventPosts);

// Reaction routes

//add or remove reaction
router.post(
  '/reaction',
  auth('User'),
  validateRequest(PostValidation.addOrRemoveReactionValidationSchema),
  PostController.addOrRemoveReaction
);

//add or remove comment reaction
router.post(
  '/comment-reaction',
  auth('User'),
  validateRequest(PostValidation.addOrRemoveCommentReactionValidationSchema),
  PostController.addOrRemoveCommentReaction
);

// Comment routes

//create comment
router.post(
  '/comment',
  auth('User'),
  validateRequest(PostValidation.createCommentValidationSchema),
  PostController.createComment
);

//update  comment
router.patch(
  '/comment/:commentId',
  auth('User'),
  validateRequest(PostValidation.updateCommentValidationSchema),
  PostController.updateComment
);

//delete comment
router.delete(
  '/comment/:commentId',
  auth('User'),
  validateRequest(PostValidation.deleteCommentValidationSchema),
  PostController.deleteComment
);

// get visited posts
router.get(
  '/visited-posts',
  auth('User'),
  PostController.getVisitedPostsWithDistance
);

// single post routes
router
  .route('/:postId')
  // get single post
  .get(PostController.getPostById)
  // update post
  .patch(
    auth('User'),
    upload.array('postFiles', 10),
    validateRequest(PostValidation.updatePostValidationSchema),
    PostController.updatePost
  )
  // delete post
  .delete(auth('User'), PostController.deletePost);

export const PostRoutes = router;
