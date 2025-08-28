import express from 'express';
import { UserController } from './user.controller';
import { fullAuth } from '../../middlewares/smartAuth';
import validateRequest from '../../shared/validateRequest';
import { UserValidation } from './user.validation';
import fileUploadHandler from '../../shared/fileUploadHandler';
import { USER_UPLOADS_FOLDER } from './user.constant';
const upload = fileUploadHandler(USER_UPLOADS_FOLDER);

const router = express.Router();

//check user name already exists
router.get(
  '/check-username/:userName',
  fullAuth('Common'),
  UserController.checkUserNameAlreadyExists
);

// update privacy
router.patch(
  '/privacy-settings',
  fullAuth('Common'),
  validateRequest(UserValidation.privacySettingsValidationSchema),
  UserController.updatePrivacySettings
);

//get single user by username
router.get('/username/:userName', UserController.getSingleUser);

//update profile image
router.post(
  '/profile-image',
  fullAuth('Common'),
  upload.single('profileImage'),
  UserController.updateProfileImage
);

//update cover image
router.post(
  '/cover-image',
  fullAuth('Common'),
  upload.single('coverImage'),
  UserController.updateCoverImage
);

// Get and fill up User Profile
router
  .route('/profile')
  .get(fullAuth('Common'), UserController.getMyProfile)
  .patch(fullAuth('Common'), UserController.updateMyProfile)
  .delete(fullAuth('Common'), UserController.deleteMyProfile);

// Set Latest User Location
router.post(
  '/location',
  fullAuth('Common'),
  validateRequest(UserValidation.setLatestLocationValidationSchema),
  UserController.setUserLatestLocation
);

router.post(
  '/create-user',
  fullAuth('Super_Admin'),
  UserController.createAdminOrSuperAdmin
);

// Get Single User by ID, Update User Profile, Change User Status
router
  .route('/:userId')
  .get(fullAuth('Common'), UserController.getSingleUserByUser)
  .patch(
    fullAuth('Admin'),
    UserController.updateUserStatus // Admin can change user status
  );

// Export User Routes
export const UserRoutes = router;
