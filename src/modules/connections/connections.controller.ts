import { Request, Response } from 'express';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { ConnectionsService } from './connections.services';
import pick from '../../shared/pick';

const addConnection = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { receivedBy } = req.body;
  const result = await ConnectionsService.addConnection(userId, receivedBy);
  sendResponse(res, {
    code: 200,
    message: 'Connection request sent successfully',
    data: result,
  });
});

const acceptConnection = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { connectionId } = req.params;
  const result = await ConnectionsService.acceptConnection(
    connectionId,
    userId
  );
  sendResponse(res, {
    code: 200,
    message: 'Connection accepted successfully',
    data: {},
  });
});

const declineConnection = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { connectionId } = req.params;
  const result = await ConnectionsService.declineConnection(
    connectionId,
    userId
  );
  sendResponse(res, {
    code: 200,
    message: 'Connection declined successfully',
    data: {},
  });
});

const removeConnection = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { removedByUserId } = req.params;
  const result = await ConnectionsService.removeConnection(
    userId,
    removedByUserId
  );
  sendResponse(res, {
    code: 200,
    message: 'Connection removed successfully',
    data: {},
  });
});

const cancelRequest = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { friendId } = req.params;
  const result = await ConnectionsService.cancelRequest(userId, friendId);
  sendResponse(res, {
    code: 200,
    message: 'Connection request cancelled successfully',
    data: {},
  });
});

const deleteConnection = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { deleteByUserId } = req.params;
  await ConnectionsService.deleteConnection(
    deleteByUserId,
    userId
  );
  sendResponse(res, {
    code: 200,
    message: 'Connection deleted successfully',
    data: "",
  });
});
const getMyAllConnections = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['searchTerm']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await ConnectionsService.getMyAllConnections(filters, options);
  sendResponse(res, {
    code: 200,
    message: 'Connections retrieved successfully',
    data: result,
  });
});

const getMyAllRequests = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['fullName']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await ConnectionsService.getMyAllRequests(filters, options);
  sendResponse(res, {
    code: 200,
    message: 'Pending requests retrieved successfully',
    data: result,
  });
});

const getSentMyRequests = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['userId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await ConnectionsService.getSentMyRequests(filters, options);
  sendResponse(res, {
    code: 200,
    message: 'Sent requests retrieved successfully',
    data: result,
  });
});

const getMutualConnections = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { userId2 } = req.params;
  const result = await ConnectionsService.getMutualConnections(userId, userId2);
  sendResponse(res, {
    code: 200,
    message: 'Mutual connections retrieved successfully',
    data: result,
  });
});

const checkConnectionStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const { userId2 } = req.params;
    const result = await ConnectionsService.checkConnectionStatus(
      userId,
      userId2
    );
    sendResponse(res, {
      code: 200,
      message: 'Connection status retrieved successfully',
      data: result,
    });
  }
);

const getConnectionSuggestions = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const filters = pick(req.query, ['fullName']);
    const options = pick(req.query, ['page', 'limit', 'populate', 'sortBy']);
    const result = await ConnectionsService.getConnectionSuggestions(
      userId,
      filters,
      options
    );
    sendResponse(res, {
      code: 200,
      message: 'Connection suggestions retrieved successfully',
      data: result,
    });
  }
);

const checkIsSentConnectionExists = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const { friendId } = req.params;
    const result = await ConnectionsService.checkIsSentConnectionExists(
      userId,
      friendId
    );
    sendResponse(res, {
      code: 200,
      message: 'Connection sent retrieved successfully',
      data: result,
    });
  }
);
export const ConnectionsController = {
  addConnection,
  acceptConnection,
  declineConnection,
  removeConnection,
  cancelRequest,
  deleteConnection,
  checkIsSentConnectionExists,
  getMyAllConnections,
  getMyAllRequests,
  getSentMyRequests,
  getMutualConnections,
  checkConnectionStatus,
  getConnectionSuggestions,
};
