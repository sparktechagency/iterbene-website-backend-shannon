import { StatusCodes } from 'http-status-codes';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import { User } from '../user/user.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import ApiError from '../../errors/ApiError';

const addNotification = async (
  payload: INotification
): Promise<INotification> => {
  // Save the notification to the database
  const result = await Notification.create(payload);
  return result;
};

const getALLNotification = async (
  filters: Partial<INotification>,
  options: PaginateOptions,
  userId: string
) => {
  const query: Record<string, any> = {
    receiverId: userId,
    type: { $ne: 'message' },
  };
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;
  // const get unviewed notifications count
  const count = await Notification.countDocuments({
    receiverId: userId,
    viewStatus: false,
  });
  const result = await Notification.paginate(query, options);
  return { ...result, count };
};

const getALLMessageNotification = async (
  filters: Partial<INotification>,
  options: PaginateOptions,
  userId: string
) => {
  filters.receiverId = userId;
  filters.type = 'message';
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;
  // const get unviewed notifications count
  const count = await Notification.countDocuments({
    receiverId: userId,
    viewStatus: false,
    type: 'message',
  });
  const result = await Notification.paginate(filters, options);
  return { ...result, count };
};

const getAdminNotifications = async (
  filters: Partial<INotification>,
  options: PaginateOptions
): Promise<PaginateResult<INotification>> => {
  filters.role = 'admin';
  return Notification.paginate(filters, options);
};

const getSingleNotification = async (
  notificationId: string
): Promise<INotification | null> => {
  const result = await Notification.findById(notificationId);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return result;
};

const addCustomNotification = async (
  eventName: string,
  notifications: INotification,
  userId?: string
) => {
  const notificationEvent = `${eventName}::${userId}`;
  const result = await addNotification(notifications);

  if (eventName === 'admin-notification' && notifications.role === 'admin') {
    //@ts-ignore
    io.emit('admin-notification', {
      code: StatusCodes.OK,
      message: notifications.title || 'New notification',
      data: result,
    });
  } else {
    //@ts-ignore
    io.emit(notificationEvent, {
      code: StatusCodes.OK,
      message: notifications.title || 'New notification',
      data: result,
    });
  }
  return result;
};

const getUnViewNotificationCount = async (userId: string) => {
  const result = await Notification.countDocuments({
    receiverId: userId,
    viewStatus: false,
    // type $ne admin-notification and message-notification
    type: { $ne: 'message' },
  });
  return { count: result };
};

const getUnViewMessageNotificationCount = async (userId: string) => {
  const result = await Notification.countDocuments({
    receiverId: userId,
    viewStatus: false,
    type: 'message',
  });
  return { count: result };
};

const viewAllNotifications = async (userId: string, type?: string) => {
  const result = await Notification.updateMany(
    { receiverId: userId, ...(type && { type: type }) },
    { viewStatus: true }
  );
  return result;
};

const viewSingleNotification = async (notificationId: string) => {
  const result = await Notification.findByIdAndUpdate(
    notificationId,
    { viewStatus: true },
    { new: true }
  );
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return result;
};
const deleteNotification = async (notificationId: string) => {
  const result = await Notification.findByIdAndDelete(notificationId);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return result;
};

const clearAllNotification = async (userId: string) => {
  const user = await User.findById(userId);
  if (user?.role === 'admin') {
    const result = await Notification.deleteMany({ role: 'admin' });
    return result;
  }
  const result = await Notification.deleteMany({ receiverId: userId });
  return result;
};
export const NotificationService = {
  addNotification,
  getALLNotification,
  getALLMessageNotification,
  getAdminNotifications,
  getSingleNotification,
  addCustomNotification,
  viewAllNotifications,
  deleteNotification,
  viewSingleNotification,
  getUnViewNotificationCount,
  clearAllNotification,
  getUnViewMessageNotificationCount,
};
