import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { User } from '../user/user.model';
import { Connections } from './connections.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { ConnectionStatus, IConnections } from './connections.interface';
import mongoose from 'mongoose';

const addConnection = async (
  sentByUserId: string,
  receivedByUserId: string
) => {
  const sentByUser = await User.findById(sentByUserId);
  if (!sentByUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sent By User not found');
  }
  const receivedByUser = await User.findById(receivedByUserId);
  if (!receivedByUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Received By User not found');
  }

  if (sentByUserId === receivedByUserId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot connect yourself');
  }

  if (sentByUser.blockedUsers?.includes(new mongoose.Types.ObjectId(receivedByUserId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You have blocked this user');
  }
  if (receivedByUser.blockedUsers?.includes(new mongoose.Types.ObjectId(sentByUserId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are blocked by this user');
  }

  const existingConnection = await Connections.findOne({
    $or: [
      { sentBy: sentByUserId, receivedBy: receivedByUserId },
      { sentBy: receivedByUserId, receivedBy: sentByUserId },
    ],
  });
  if (existingConnection) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Connection already exists with status: ${existingConnection.status}`
    );
  }

  const newConnection = new Connections({
    sentBy: sentByUserId,
    receivedBy: receivedByUserId,
  });
  await newConnection.save();
  return newConnection;
};

const acceptConnection = async (connectionId: string, userId: string) => {
  const connection = await Connections.findById(connectionId);
  if (!connection) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Connection not found');
  }

  if (connection.receivedBy.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to accept this connection'
    );
  }
  if (connection.status !== ConnectionStatus.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Connection is already ${connection.status}`
    );
  }

  connection.status = ConnectionStatus.ACCEPTED;
  await connection.save();
  return connection;
};

const declineConnection = async (connectionId: string, userId: string) => {
  const connection = await Connections.findById(connectionId);
  if (!connection) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Connection not found');
  }

  if (connection.receivedBy.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to decline this connection'
    );
  }

  if (connection.status !== ConnectionStatus.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Connection is already ${connection.status}`
    );
  }

  connection.status = ConnectionStatus.DECLINED;
  await connection.save();
  return connection;
};

const removeConnection = async (connectionId: string, userId: string) => {
  const connection = await Connections.findById(connectionId);
  if (!connection) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Connection not found');
  }

  if (
    connection.sentBy.toString() !== userId &&
    connection.receivedBy.toString() !== userId
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to remove this connection'
    );
  }

  if (connection.status !== ConnectionStatus.ACCEPTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Only accepted connections can be removed`
    );
  }

  await Connections.findByIdAndDelete(connectionId);
  return { message: 'Connection removed successfully' };
};

const cancelRequest = async (connectionId: string, userId: string) => {
  const connection = await Connections.findById(connectionId);
  if (!connection) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Connection not found');
  }

  if (connection.sentBy.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this request'
    );
  }

  if (connection.status !== ConnectionStatus.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Only pending requests can be cancelled`
    );
  }

  await Connections.findByIdAndDelete(connectionId);
  return { message: 'Connection request cancelled successfully' };
};

const getMyAllConnections = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IConnections>> => {
  const query: Record<string, any> = {
    status: ConnectionStatus.ACCEPTED,
  };
  if (filters.userId) {
    query.$or = [{ sentBy: filters.userId }, { receivedBy: filters.userId }];
  }
  options.sortBy = options.sortBy || '-createdAt';
  const connections = await Connections.paginate(query, options);
  return connections;
};
const getMyAllRequests = async (
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IConnections>> => {
    const query: Record<string, any> = {
      status: ConnectionStatus.PENDING,
      receivedBy: filters.userId,
    };
  
    options.sortBy = options.sortBy || '-createdAt';
    const connections = await Connections.paginate(query, options);
    return connections;
  };
const getSentMyRequests = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IConnections>> => {
  const query: Record<string, any> = {
    status: ConnectionStatus.PENDING,
    sentBy: filters.userId,
  };

  options.sortBy = options.sortBy || '-createdAt';
  const connections = await Connections.paginate(query, options);
  return connections;
};

const blockUser = async (blockerId: string, blockedUserId: string) => {
  const blocker = await User.findById(blockerId);
  if (!blocker) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blocker user not found');
  }
  const blockedUser = await User.findById(blockedUserId);
  if (!blockedUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blocked user not found');
  }

  if (blockerId === blockedUserId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot block yourself');
  }

  if (blocker.blockedUsers?.includes(new mongoose.Types.ObjectId(blockedUserId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already blocked');
  }

  blocker.blockedUsers = blocker.blockedUsers || [];
  blocker.blockedUsers.push(new mongoose.Types.ObjectId(blockedUserId));
  await blocker.save();

  await Connections.deleteMany({
    $or: [
      { sentBy: blockerId, receivedBy: blockedUserId },
      { sentBy: blockedUserId, receivedBy: blockerId },
    ],
  });

  return { message: 'User blocked successfully' };
};


const unblockUser = async (blockerId: string, blockedUserId: string) => {
  const blocker = await User.findById(blockerId);
  if (!blocker) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blocker user not found');
  }

  blocker.blockedUsers = blocker.blockedUsers?.filter(
    id => id.toString() !== blockedUserId
  );
  await blocker.save();

  return { message: 'User unblocked successfully' };
};

const getMutualConnections = async (
  userId1: string,
  userId2: string
): Promise<string[]> => {
  const connections1 = await Connections.find({
    $or: [{ sentBy: userId1 }, { receivedBy: userId1 }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const connections2 = await Connections.find({
    $or: [{ sentBy: userId2 }, { receivedBy: userId2 }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const friends1 = connections1.map(conn =>
    conn.sentBy.toString() === userId1
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );
  const friends2 = connections2.map(conn =>
    conn.sentBy.toString() === userId2
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );

  const mutualFriends = friends1.filter(friend => friends2.includes(friend));
  return mutualFriends;
};

const checkConnectionStatus = async (
  userId1: string,
  userId2: string
): Promise<ConnectionStatus | null> => {
  const connection = await Connections.findOne({
    $or: [
      { sentBy: userId1, receivedBy: userId2 },
      { sentBy: userId2, receivedBy: userId1 },
    ],
  });

  return connection ? connection.status : null;
};

const getConnectionSuggestions = async (
  userId: string,
  limit: number = 10
): Promise<string[]> => {
  const user = await User.findById(userId).select('blockedUsers');
  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const friends = connections.map(conn =>
    conn.sentBy.toString() === userId
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );

  const friendConnections = await Connections.find({
    $or: [{ sentBy: { $in: friends } }, { receivedBy: { $in: friends } }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const suggestions: string[] = [];
  friendConnections.forEach(conn => {
    const otherUser =
      conn.sentBy.toString() === userId
        ? conn.receivedBy.toString()
        : conn.sentBy.toString();
    if (
      otherUser !== userId &&
      !friends.includes(otherUser) &&
      !suggestions.includes(otherUser) &&
      !user?.blockedUsers?.includes(new mongoose.Types.ObjectId(otherUser))
    ) {
      suggestions.push(otherUser);
    }
  });

  return suggestions.slice(0, limit);
};

export const ConnectionsService = {
  addConnection,
  acceptConnection,
  declineConnection,
  removeConnection,
  cancelRequest,
  getMyAllConnections,
  getMyAllRequests,
  getSentMyRequests,
  blockUser,
  unblockUser,
  getMutualConnections,
  checkConnectionStatus,
  getConnectionSuggestions,
};
