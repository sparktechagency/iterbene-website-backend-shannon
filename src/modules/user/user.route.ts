import express from 'express';
import { UserController } from './user.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { UserValidation } from './user.validation';
import fileUploadHandler from '../../shared/fileUploadHandler';
const UPLOADS_FOLDER = 'uploads/users';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = express.Router();

//check user name already exists
router.get(
  '/check-username/:userName',
  auth('Common'),
  UserController.checkUserNameAlreadyExists
);

//get single user by username
router.get('/username/:userName', auth('Common'), UserController.getSingleUser);

//update profile image
router.post(
  '/profile-image',
  auth('Common'),
  upload.single('profileImage'),
  UserController.updateProfileImage
);

//update cover image
router.post(
  '/cover-image',
  auth('Common'),
  upload.single('coverImage'),
  UserController.updateCoverImage
);

// Get and fill up User Profile
router
  .route('/profile')
  .get(auth('Common'), UserController.getMyProfile)
  .patch(auth('Common'), UserController.updateMyProfile)
  .delete(auth('Common'), UserController.deleteMyProfile);

// Set Latest User Location
router.post(
  '/location',
  auth('Common'),
  validateRequest(UserValidation.setLatestLocationValidationSchema),
  UserController.setUserLatestLocation
);

router.post(
  '/create-user',
  auth('Super_Admin'),
  UserController.createAdminOrSuperAdmin
);

// Get Single User by ID, Update User Profile, Change User Status
router.route('/:userId').patch(
  auth('Admin'),
  UserController.updateUserStatus // Admin can change user status
);

// Export User Routes
export const UserRoutes = router;
