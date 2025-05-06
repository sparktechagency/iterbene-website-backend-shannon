import { Router } from 'express';
import auth from '../../middlewares/auth';
import { NotificationController } from './notification.controllers';

const router = Router();

router.get(
  '/unview-notification-count',
  auth('common'),
  NotificationController.getUnViewNotificationCount
);

/** ========================View all notifications route here==================== */
router
  .route('/view-all-notifications')
  .get(auth('common'), NotificationController.viewAllNotifications);

/** ========================Clear all notifications route here==================== */
router
  .route('/clear-all-notifications')
  .delete(auth('common'), NotificationController.clearAllNotification);

/** ========================Admin all notifications route here==================== */
router
  .route('/admin-notifications')
  .get(auth('admin'), NotificationController.getAdminNotifications);

/** ========================User all notifications route here==================== */
router
  .route('/')
  .get(auth('common'), NotificationController.getALLNotification);

/** ========================Single notifications route here==================== */
router
  .route('/:id')
  .get(auth('common'), NotificationController.getSingleNotification)
  /** ========================Delete Single notifications route here==================== */
  .delete(auth('common'), NotificationController.deleteNotification);

export const NotificationRoutes = router;
