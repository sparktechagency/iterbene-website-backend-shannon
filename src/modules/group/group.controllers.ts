import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { GroupService } from './group.services';

// Creates a new travel group
const createGroup = catchAsync(async (req, res) => {
  const { userId } = req.user;
  req.body.creatorId = userId;
  req.body.groupImage = 'Uploads/groups'; // Default group image path
  
  const result = await GroupService.createGroup(req.body);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Group created successfully',
    data: result,
  });
});

// Allows a user to join a travel group
const joinGroup = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { groupId } = req.params;
  const result = await GroupService.joinGroup(userId, groupId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Join request processed successfully',
    data: result,
  });
});

// Approves a user's join request for a private travel group
const approveJoinRequest = catchAsync(async (req, res) => {
  const { userId } = req.user; // Admin ID
  const { groupId, userId: targetUserId } = req.params; // User to approve
  const result = await GroupService.approveJoinRequest(userId, groupId, targetUserId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Join request approved successfully',
    data: result,
  });
});

// Sends an invitation to join a travel group
const sendGroupInvite = catchAsync(async (req, res) => {
  const { userId } = req.user; // Sender ID
  const { toUserId, groupId } = req.body;
  const result = await GroupService.sendGroupInvite(userId, toUserId, groupId);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Group invite sent successfully',
    data: result,
  });
});

// Accepts a group invitation
const acceptGroupInvite = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { inviteId } = req.params;
  const result = await GroupService.acceptGroupInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group invite accepted successfully',
    data: result,
  });
});

// Declines a group invitation
const declineGroupInvite = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { inviteId } = req.params;
  const result = await GroupService.declineGroupInvite(userId, inviteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group invite declined successfully',
    data: result,
  });
});

// Promotes group members to co-leaders
const addCoLeadersInGroup = catchAsync(async (req, res) => {
  const { userId } = req.user; // Admin ID
  const { groupId } = req.params;
  const { coLeaders } = req.body; // Array of user IDs to promote
  const result = await GroupService.addCoLeadersInGroup(userId, groupId, coLeaders);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Co-leaders added successfully',
    data: result,
  });
});

// Allows a user to leave a travel group
const leaveGroup = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { groupId } = req.params;
  const result = await GroupService.leaveGroup(userId, groupId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Left group successfully',
    data: result,
  });
});

// Deletes a travel group
const deleteGroup = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { groupId } = req.params;
  await GroupService.deleteGroup(userId, groupId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group deleted successfully',
    data: null,
  });
});

// Retrieves a travel group's details
const getGroup = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const result = await GroupService.getGroup(groupId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group retrieved successfully',
    data: result,
  });
});

export const GroupController = {
  createGroup,
  joinGroup,
  approveJoinRequest,
  sendGroupInvite,
  acceptGroupInvite,
  declineGroupInvite,
  addCoLeadersInGroup,
  leaveGroup,
  deleteGroup,
  getGroup,
};