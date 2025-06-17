import { Router } from 'express';
import auth from '../../middlewares/auth';
import { NotificationController } from './notification.controllers';

const router = Router();

router.get(
  '/unview-notification-count',
  auth('Common'),
  NotificationController.getUnViewNotificationCount
);

/** ========================View all notifications route here==================== */
router
  .route('/view-all-notifications')
  .post(auth('Common'), NotificationController.viewAllNotifications);

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
