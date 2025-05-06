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
  filters.receiverId = userId;
  filters.viewStatus = false;
  const unViewNotificationCount = await Notification.countDocuments({
    receiverId: userId,
    viewStatus: false,
  });

  const result = await Notification.paginate(filters, options);
  return { ...result, unViewNotificationCount };
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
    console.log('Notification Event', notificationEvent);
    console.log('Send Notification', notifications.title || 'New notification');
  }
  return result;
};

const getUnViewNotificationCount = async (userId: string) => {
  const result = await Notification.countDocuments({
    receiverId: userId,
    viewStatus: false,
  });
  return {count: result};
}

const viewAllNotifications = async (userId: string) => {
  const result = await Notification.updateMany(
    { receiverId: userId },
    { viewStatus: true }
  );
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
  getAdminNotifications,
  getSingleNotification,
  addCustomNotification,
  viewAllNotifications,
  deleteNotification,
  getUnViewNotificationCount,
  clearAllNotification,
};
