import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { GroupService } from './group.services';
import { uploadFilesToS3 } from '../../helpers/s3Service';
const UPLOADS_FOLDER = 'uploads/groups';

const createGroup = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const file = req.file as Express.Multer.File;
  // parse the JSON string location and coleaders
  if (typeof req.body.location === 'string') {
    req.body.location = JSON.parse(req.body.location);
  }
  if (typeof req.body.coLeaders === 'string') {
    req.body.coLeaders = JSON.parse(req.body.coLeaders);
  }
  const groupImage = await uploadFilesToS3([file], UPLOADS_FOLDER);
  const payload = req.body;
  payload.groupImage = groupImage[0];

  const result = await GroupService.createGroup(userId, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group created successfully',
    data: result,
  });
});

const joinGroup = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId } = req.body;
  const result = await GroupService.joinGroup(userId, groupId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group join request sent or joined successfully',
    data: result,
  });
});

const leaveGroup = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId } = req.body;
  const result = await GroupService.leaveGroup(userId, groupId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Left group successfully',
    data: result,
  });
});

const approveJoinRequest = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId, memberId } = req.body;
  const result = await GroupService.approveJoinRequest(
    userId,
    groupId,
    memberId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Join request approved successfully',
    data: result,
  });
});

const rejectJoinRequest = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId, memberId } = req.body;
  const result = await GroupService.rejectJoinRequest(
    userId,
    groupId,
    memberId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Join request rejected successfully',
    data: result,
  });
});

const removeMember = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId, memberId } = req.body;
  const result = await GroupService.removeMember(userId, groupId, memberId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Member removed successfully',
    data: result,
  });
});

const promoteToAdmin = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId, memberId } = req.body;
  const result = await GroupService.promoteToAdmin(userId, groupId, memberId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Member promoted to admin successfully',
    data: result,
  });
});

const demoteAdmin = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId, adminId } = req.body;
  const result = await GroupService.demoteAdmin(userId, groupId, adminId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Admin demoted successfully',
    data: result,
  });
});

const promoteToCoLeader = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId, memberId } = req.body;
  const result = await GroupService.promoteToCoLeader(
    userId,
    groupId,
    memberId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Member promoted to co-leader successfully',
    data: result,
  });
});

const demoteCoLeader = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId, coLeaderId } = req.body;
  const result = await GroupService.demoteCoLeader(userId, groupId, coLeaderId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Co-leader demoted successfully',
    data: result,
  });
});

const getGroup = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const result = await GroupService.getGroup(userId, id);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group retrieved successfully',
    data: result,
  });
});
const updateGroup = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const payload = req.body;
  const result = await GroupService.updateGroup(userId, id, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group updated successfully',
    data: result,
  });
});

const deleteGroup = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const result = await GroupService.deleteGroup(userId, id);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group deleted successfully',
    data: result,
  });
});

const getMyGroups = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const result = await GroupService.getMyGroups(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'My groups retrieved successfully',
    data: result,
  });
});

const getMyJoinGroups = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const result = await GroupService.getMyJoinGroups(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Joined groups retrieved successfully',
    data: result,
  });
});

const getGroupSuggestions = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const result = await GroupService.getGroupSuggestions(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group suggestions retrieved successfully',
    data: result,
  });
});

export const GroupController = {
  createGroup,
  joinGroup,
  leaveGroup,
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
  promoteToCoLeader,
  demoteCoLeader,
  getGroup,
  updateGroup,
  deleteGroup,
  getMyGroups,
  getMyJoinGroups,
  getGroupSuggestions,
};
