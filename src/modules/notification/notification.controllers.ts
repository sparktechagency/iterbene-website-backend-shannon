import { StatusCodes } from 'http-status-codes';
import { NotificationService } from './notification.services';
import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import sendResponse from '../../shared/sendResponse';
import { notificationFilters } from './notification.constants';

const getALLNotification = catchAsync(async (req, res) => {
  const filters = pick(req.query, notificationFilters);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const { userId } = req.user;
  const result = await NotificationService.getALLNotification(
    filters,
    options,
    userId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Notifications fetched successfully',
  });
});
const getALLMessageNotification = catchAsync(async (req, res) => {
  const filters = pick(req.query, notificationFilters);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const { userId } = req.user;
  const result = await NotificationService.getALLMessageNotification(
    filters,
    options,
    userId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Notifications fetched successfully',
  });
});

const getAdminNotifications = catchAsync(async (req, res) => {
  const filters = pick(req.query, notificationFilters);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const result = await NotificationService.getAdminNotifications(
    filters,
    options
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Admin Notifications fetched successfully',
  });
});

const getUnViewNotificationCount = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await NotificationService.getUnViewNotificationCount(userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Notifications count fetched successfully',
  });
});

const getUnViewMessageNotificationCount = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await NotificationService.getUnViewMessageNotificationCount(
    userId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Notifications count fetched successfully',
  });
});
const getSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.getSingleNotification(id);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Notification fetched successfully',
  });
});

const viewAllNotifications = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { type } = req.query;
  await NotificationService.viewAllNotifications(userId, type as string);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'All notifications viewed successfully',
    data: {},
  });
});

const viewSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  await NotificationService.viewSingleNotification(id);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Notification viewed successfully',
    data: {},
  });
});
const deleteNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  await NotificationService.deleteNotification(id);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Notification deleted successfully',
    data: {},
  });
});

const clearAllNotification = catchAsync(async (req, res) => {
  const { userId } = req.user;
  await NotificationService.clearAllNotification(userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'All notifications cleared successfully',
    data: {},
  });
});

export const NotificationController = {
  getALLNotification,
  getALLMessageNotification,
  getAdminNotifications,
  getSingleNotification,
  getUnViewNotificationCount,
  viewAllNotifications,
  viewSingleNotification,
  deleteNotification,
  clearAllNotification,
  getUnViewMessageNotificationCount,
};
