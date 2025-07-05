import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { EventInviteService } from './eventInvite.services';
import pick from '../../shared/pick';

const sendInvite = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const payload = req.body;
  const result = await EventInviteService.sendInvite(userId, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite(s) sent successfully',
    data: result,
  });
});

const acceptInvite = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { inviteId } = req.body;
  const result = await EventInviteService.acceptInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite accepted successfully',
    data: result,
  });
});

const declineInvite = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { inviteId } = req.body;
  const result = await EventInviteService.declineInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite declined successfully',
    data: result,
  });
});

const cancelInvite = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { inviteId } = req.body;
  const result = await EventInviteService.cancelInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite cancelled successfully',
    data: result,
  });
});

const getMyInvites = catchAsync(async (req, res) => {
  const { userId } = req?.user;
  const filters = pick(req.query, ['name']);
  const options = pick(req.query, ['limit', 'page', 'sortBy']);
  filters.userId = userId;
  const result = await EventInviteService.getMyInvites(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'My Invites events retrieved successfully',
    data: result,
  });
});

export const EventInviteController = {
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite,
  getMyInvites,
};
