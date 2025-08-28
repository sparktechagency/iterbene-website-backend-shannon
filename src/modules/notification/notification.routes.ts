import { Router } from 'express';
import { NotificationController } from './notification.controllers';
import { fullAuth } from '../../middlewares/smartAuth';

const router = Router();

router.get(
  '/unview-notification-count',
  fullAuth('Common'),
  NotificationController.getUnViewNotificationCount
);

router.get(
  '/unview-message-notification-count',
  fullAuth('Common'),
  NotificationController.getUnViewMessageNotificationCount
);

/** ========================View all notifications route here==================== */
router
  .route('/view-all-notifications')
  .post(fullAuth('Common'), NotificationController.viewAllNotifications);

/** ========================View all message notifications route here==================== */
router
  .route('/view-all-message-notifications')
  .post(fullAuth('Common'), NotificationController.viewAllMessageNotifications);

/** ========================Get all message notifications route here==================== */
router
  .route('/get-all-message-notifications')
  .get(fullAuth('Common'), NotificationController.getALLMessageNotification);

/** ========================View single notifications route here==================== */
router
  .route('/view-single-notification')
  .post(fullAuth('Common'), NotificationController.viewSingleNotification);

/** ========================Clear all notifications route here==================== */
router
  .route('/clear-all-notifications')
  .delete(fullAuth('Common'), NotificationController.clearAllNotification);

/** ========================Admin all notifications route here==================== */
router
  .route('/admin-notifications')
  .get(fullAuth('admin'), NotificationController.getAdminNotifications);

/** ========================User all notifications route here==================== */
router
  .route('/')
  .get(fullAuth('Common'), NotificationController.getALLNotification);

/** ========================Single notifications route here==================== */
router
  .route('/:id')
  .get(fullAuth('Common'), NotificationController.getSingleNotification)
  .patch(fullAuth('Common'), NotificationController.viewSingleNotification)
  /** ========================Delete Single notifications route here==================== */
  .delete(fullAuth('Common'), NotificationController.deleteNotification);

export const NotificationRoutes = router;
