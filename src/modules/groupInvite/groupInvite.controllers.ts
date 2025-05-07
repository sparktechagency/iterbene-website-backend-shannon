import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import sendResponse from '../../shared/sendResponse';
import { GroupInviteService } from './groupInvite.services';

const getMyInvitedGroups = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['groupId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.to = userId;
  const result = await GroupInviteService.getMyInvitedGroups(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'My invited groups fetched successfully.',
  });
});

export const GroupInviteController = {
  getMyInvitedGroups,
};
