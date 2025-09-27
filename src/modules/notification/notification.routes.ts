import { Router } from 'express';
import { NotificationController } from './notification.controllers';
import auth from '../../middlewares/auth';

const router = Router();

router.get(
  '/unview-notification-count',
  auth('Common'),
  NotificationController.getUnViewNotificationCount
);

router.get(
  '/unview-message-notification-count',
  auth('Common'),
  NotificationController.getUnViewMessageNotificationCount
);

/** ========================View all notifications route here==================== */
router
  .route('/view-all-notifications')
  .post(auth('Common'), NotificationController.viewAllNotifications);

/** ========================View all message notifications route here==================== */
router
  .route('/view-all-message-notifications')
  .post(auth('Common'), NotificationController.viewAllMessageNotifications);

/** ========================Get all message notifications route here==================== */
router
  .route('/get-all-message-notifications')
  .get(auth('Common'), NotificationController.getALLMessageNotification);

/** ========================View single notifications route here==================== */
router
  .route('/view-single-notification')
  .post(auth('Common'), NotificationController.viewSingleNotification);

/** ========================View single notifications viewSingleNotificationBySenderId==================== */
router
  .route('/view-single-message-notification/:senderId')
  .patch(auth('Common'), NotificationController.viewSingleMessageNotification);

/** ========================Clear all notifications route here==================== */
router
  .route('/clear-all-notifications')
  .delete(auth('Common'), NotificationController.clearAllNotification);

/** ========================Admin all notifications route here==================== */
router
  .route('/admin-notifications')
  .get(auth('admin'), NotificationController.getAdminNotifications);

/** ========================User all notifications route here==================== */
router
  .route('/')
  .get(auth('Common'), NotificationController.getALLNotification);

/** ========================Single notifications route here==================== */
router
  .route('/:id')
  .get(auth('Common'), NotificationController.getSingleNotification)
  .patch(auth('Common'), NotificationController.viewSingleNotification)
  /** ========================Delete Single notifications route here==================== */
  .delete(auth('Common'), NotificationController.deleteNotification);

export const NotificationRoutes = router;
