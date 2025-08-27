import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { IReport, ReportType } from './reports.interface';
import { Report } from './reports.model';
import { User } from '../user/user.model';
import {
  sendBanNotificationEmail,
  sendReportConfirmation,
  sendWarningEmail,
} from '../../helpers/emailService';
import { Post } from '../post/post.model';
import Message from '../message/message.model';

const addReport = async (payload: IReport): Promise<IReport> => {
  if (payload.reporter === payload.reportedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot report yourself');
  }

  const reporter = await User.findById(payload.reporter);
  if (!reporter) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Reporter does not exist');
  }

  const reportedUser = await User.findById(payload.reportedUser);
  if (!reportedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Reported user does not exist');
  }

  // Validate reported entities based on reportType
  if (payload.reportType === ReportType.MESSAGE && payload.reportedMessageId) {
    const message = await Message.findById(payload.reportedMessageId);
    if (!message) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Reported message does not exist'
      );
    }
  }
  if (payload.reportType === ReportType.POST && payload.reportedPostId) {
    const post = await Post.findById(payload.reportedPostId);
    if (!post) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Reported post does not exist'
      );
    }
  }
  if (
    payload.reportType === ReportType.COMMENT &&
    payload.reportedPostId &&
    payload.reportedCommentId
  ) {
    const post = await Post.findOne({
      _id: payload.reportedPostId,
      'comments._id': payload.reportedCommentId,
    });
    if (!post) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Reported comment or post does not exist'
      );
    }
  }

  const result = await Report.create(payload);

  try {
    await sendReportConfirmation(reporter.email, reporter.fullName as string);
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to send report confirmation email'
    );
  }

  // const adminNotificationEvent = 'admin-notification';
  // const adminNotificationPayload: INotification = {
  //   title: `New ${payload.reportType} Report Submitted`,
  //   message: `${reporter.fullName || 'A user'} has reported a ${
  //     payload.reportType
  //   } by ${reportedUser.fullName || 'another user'} for "${
  //     payload.reportReason.join(', ') || 'unspecified reasons'
  //   }". Please review the report.`,
  //   linkId: result._id,
  //   type: 'report',
  //   role: 'admin',
  // };
  // await NotificationService.addCustomNotification(
  //   adminNotificationEvent,
  //   adminNotificationPayload
  // );

  return result;
};

const getAllReports = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IReport>> => {
  options.populate = [
    {
      path: 'reporter',
      select: 'fullName email profileImage username ',
    },
    {
      path: 'reportedUser',
      select: 'fullName email profileImage username ',
    },
  ];
  const result = await Report.paginate(filters, options);
  return result;
};

const getSingleReport = async (reportId: string): Promise<IReport> => {
  const result = await Report.findById(reportId).populate([
    {
      path: 'reporter',
      select: 'fullName email profileImage username',
    },
    {
      path: 'reportedUser',
      select: 'fullName email profileImage username',
    },
  ]);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found');
  }
  return result;
};
const sendWarningMessageForReportedUser = async (
  reportedUserId: string,
  warningMessage: string
) => {
  const reportedUser = await User.findById(reportedUserId);
  if (!reportedUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  sendWarningEmail(
    reportedUser.email,
    reportedUser?.fullName as string,
    warningMessage
  );
};

const banUser = async (bannedUserId: string, duration: string) => {
  const user = await User.findById(bannedUserId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  let banUntil: Date | null = null;
  let banMessage = '';

  switch (duration) {
    case '1 Day':
      banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      banMessage =
        'Your account has been temporarily banned for 1 day due to a violation of our community guidelines.';
      break;
    case '1 Week':
      banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      banMessage =
        'Your account has been temporarily banned for 7 days due to repeated violations.';
      break;
    case '1 Month':
      banUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      banMessage =
        'Your account has been temporarily banned for 30 days due to multiple infractions.';
      break;
    case 'Permanent':
      banUntil = null; // Permanent ban has no expiry
      banMessage =
        'Your account has been permanently banned due to severe violations of our policies.';
      break;
    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid ban duration');
  }

  user.isBanned = true;
  user.banUntil = banUntil as Date;
  user.status = 'Banned'; // Set user status to inactive
  await user.save();

  // ✅ Send Email Notification to the User
  await sendBanNotificationEmail(
    user.email,
    user?.fullName as string,
    banMessage,
    banUntil
  );

  return user;
};

const unbanUser = async (bannedUserId: string) => {
  const user = await User.findById(bannedUserId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  user.isBanned = false;
  user.banUntil = null;
  await user.save();

  return user;
};

export const ReportServices = {
  addReport,
  getAllReports,
  getSingleReport,
  sendWarningMessageForReportedUser,
  banUser,
  unbanUser,
};
