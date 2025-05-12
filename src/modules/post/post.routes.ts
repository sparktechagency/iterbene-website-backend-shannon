import { Router } from 'express';
import auth from '../../middlewares/auth';
import { PostController } from './post.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';
const UPLOADS_FOLDER = 'uploads/posts';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();

router
  .route('/')
  .post(auth('User'), upload.array('postFiles', 10), PostController.createPost);


export const PostRoutes = router;