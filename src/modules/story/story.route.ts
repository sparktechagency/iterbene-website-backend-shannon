import express from 'express';
import { StoryController } from './story.controller';
import validateRequest from '../../shared/validateRequest';
import { StoryValidation } from './story.validation';
import fileUploadHandler from '../../shared/fileUploadHandler';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import auth from '../../middlewares/auth';
const STORY_UPLOADS_FOLDER = 'uploads/stories';
const upload = fileUploadHandler(STORY_UPLOADS_FOLDER);

const router = express.Router();

// Create a story (any authenticated user)
router.post(
  '/',
  auth('Common'),
  upload.array('storyFiles', 10),
  convertHeicToPngMiddleware(STORY_UPLOADS_FOLDER),
  validateRequest(StoryValidation.createStoryValidationSchema),
  StoryController.createStory
);

// View a story (any authenticated user with access)
router.post(
  '/view',
  auth('Common'),
  validateRequest(StoryValidation.viewStoryValidationSchema),
  StoryController.viewStory
);

// React to a story (any authenticated user with access)
router.post(
  '/react',
  auth('Common'),
  validateRequest(StoryValidation.reactStoryValidationSchema),
  StoryController.reactToStory
);

// Reply to a story (any authenticated user with access)
router.post(
  '/reply',
  auth('Common'),
  validateRequest(StoryValidation.replyStoryValidationSchema),
  StoryController.replyToStory
);

// Get story feed (any authenticated user)
router.get('/feed', auth('Common'), StoryController.getStoryFeed);

// Get story viewers (creator only)
router.get(
  '/viewers/:mediaId',
  auth('Common'),
  StoryController.getStoryViewers
);

// Get a story (any authenticated user with access)
router.route('/:storyId').get(auth('Common'), StoryController.getStory);
router.route('/:mediaId').delete(auth('Common'), StoryController.deleteStory);

export const StoryRoutes = router;
