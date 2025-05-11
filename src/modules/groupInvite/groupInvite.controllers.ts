import { Request, Response } from 'express';
import { GroupInviteService } from './groupInvite.services';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';


const sendInvite = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const payload = req.body;
  const result = await GroupInviteService.sendInvite(userId, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite(s) sent successfully',
    data: result,
  });
});

const acceptInvite = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { inviteId } = req.body;
  const result = await GroupInviteService.acceptInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite accepted successfully',
    data: result,
  });
});

const declineInvite = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { inviteId } = req.body;
  const result = await GroupInviteService.declineInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite declined successfully',
    data: result,
  });
});

const cancelInvite = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { inviteId } = req.body;
  const result = await GroupInviteService.cancelInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invite cancelled successfully',
    data: result,
  });
});

const getMyInvites = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const result = await GroupInviteService.getMyInvites(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Invites retrieved successfully',
    data: result,
  });
});

export const GroupInviteController = {
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite,
  getMyInvites,
};