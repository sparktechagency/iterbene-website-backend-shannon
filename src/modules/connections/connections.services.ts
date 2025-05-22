import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { validateUsers } from '../../utils/validateUsers';
import { BlockedUser } from '../blockedUsers/blockedUsers.model';
import {
  ConnectionPrivacy,
  PrivacyVisibility,
  TUser,
} from '../user/user.interface';
import { User } from '../user/user.model';
import { ConnectionStatus, IConnections } from './connections.interface';
import { Connections } from './connections.model';
import { RemovedConnection } from '../removeConnections/removedConnections.model';

const addConnection = async (
  sentByUserId: string,
  receivedByUserId: string
) => {
  const { user1: sentByUser, user2: receivedByUser } = await validateUsers(
    sentByUserId,
    receivedByUserId,
    'Connect'
  );

  if (receivedByUser.connectionPrivacy === ConnectionPrivacy.FRIEND_TO_FRIEND) {
    const senderFriends = await Connections.find({
      $or: [{ sentBy: sentByUserId }, { receivedBy: sentByUserId }],
      status: ConnectionStatus.ACCEPTED,
    }).select('sentBy receivedBy');

    const receiverFriends = await Connections.find({
      $or: [{ sentBy: receivedByUserId }, { receivedBy: receivedByUserId }],
      status: ConnectionStatus.ACCEPTED,
    }).select('sentBy receivedBy');

    const senderFriendIds = senderFriends.map(conn =>
      conn.sentBy.toString() === sentByUserId
        ? conn.receivedBy.toString()
        : conn.sentBy.toString()
    );
    const receiverFriendIds = receiverFriends.map(conn =>
      conn.sentBy.toString() === receivedByUserId
        ? conn.receivedBy.toString()
        : conn.sentBy.toString()
    );

    const hasMutualFriends = senderFriendIds.some(id =>
      receiverFriendIds.includes(id)
    );
    if (!hasMutualFriends) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You must have mutual friends to send a connection request'
      );
    }
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
  //delete connection request
  await Connections.findByIdAndDelete(connectionId);
  return connection;
};

const deleteConnection = async (connectionId: string, userId: string) => {
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

const removeConnection = async (
  sentByUserId: string,
  removedByUserId: string
) => {
  const result = await RemovedConnection.create({
    userId: sentByUserId,
    removedUserId: removedByUserId,
  });
  return result;
};
const cancelRequest = async (userId: string, friendId: string) => {
  const result = await Connections.findOneAndDelete({
    sentBy: userId,
    receivedBy: friendId,
    status: ConnectionStatus.PENDING,
  });
  return result;
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
  options.populate = [
    {
      path: 'sentBy',
      select: 'fullName  profileImage username',
    }
  ]
  options.sortBy = options.sortBy || '-createdAt';
  const connections = await Connections.paginate(query, options);
  return connections;
};

const getMyAllRequests = async (
  filters: Record<string, any>,
  options: PaginateOptions
) => {
  const query: Record<string, any> = {
    status: ConnectionStatus.PENDING,
    receivedBy: filters.userId,
  };
  options.populate = [
    {
      path: 'sentBy',
      select: 'fullName  profileImage username',
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';
  const connections = await Connections.paginate(query, options);
  const requestCount = await Connections.countDocuments(query);
  return { ...connections, requestCount };
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
const checkIsSentConnectionExists = async (
  userId: string,
  friendId: string
) => {
  const result = await Connections.findOne({
    sentBy: userId,
    receivedBy: friendId,
    status: ConnectionStatus.PENDING,
  });
  return result;
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
  filters: Record<string, any>,
  options: PaginateOptions
) => {
  // Fetch the user to get their attributes
  const user = await User.findById(userId).select(
    'city locationName country profession privacySettings connectionPrivacy'
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Fetch user's accepted connections to exclude them
  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const friends = connections.map(conn =>
    conn.sentBy.toString() === userId
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );

  // Fetch pending or declined connections to exclude them
  const pendingOrDeclined = await Connections.find({
    $or: [
      { sentBy: userId, status: { $in: [ConnectionStatus.PENDING, ConnectionStatus.DECLINED] } },
      { receivedBy: userId, status: { $in: [ConnectionStatus.PENDING, ConnectionStatus.DECLINED] } },
    ],
  }).select('sentBy receivedBy createdAt');
  // Fetch blocked users to exclude them
  const blockedUsers = await BlockedUser.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  }).select('blockerId blockedId');

  const blockedUserIds = blockedUsers.map(block =>
    block.blockerId.toString() === userId
      ? block.blockedId.toString()
      : block.blockerId.toString()
  );

  // Fetch recently removed connections to exclude them
  const removedConnections = await RemovedConnection.find({
    userId,
  }).select('removedUserId');

  const removedUserIds = removedConnections.map(conn =>
    conn.removedUserId.toString()
  );

  // Exclude users: self, friends, blocked users, removed users, and recent pending connections
  const excludeUsers = [
    userId,
    ...friends,
    ...blockedUserIds,
    ...removedUserIds,
  ];
  // Exclude users with pending connections sent within the last 3 minutes
  const timeoutMinutes = 1; // Adjust this value as needed
  const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  const recentPending = pendingOrDeclined.filter(
    conn => conn.status === ConnectionStatus.PENDING && conn.sentBy.toString() === userId && conn.createdAt >= timeoutThreshold
  );
  const recentPendingUserIds = recentPending.map(conn => conn.receivedBy.toString());
  excludeUsers.push(...recentPendingUserIds);

  // Build query for suggestions based on attributes
  const query: Record<string, any> = {
    _id: { $nin: excludeUsers.map(id => new mongoose.Types.ObjectId(id)) },
    isDeleted: false,
    isBanned: false,
    isBlocked: false,
    $or: [],
  };

  // Add matching attributes to query if they are public
  if (
    user.privacySettings.locationName === PrivacyVisibility.PUBLIC &&
    user.locationName
  ) {
    query.$or.push({
      locationName: user.locationName,
      'privacySettings.locationName': PrivacyVisibility.PUBLIC,
    });
  }
  // country
  if(user.privacySettings.country === PrivacyVisibility.PUBLIC && user.country) {
    query.$or.push({
      country: user.country,
      'privacySettings.country': PrivacyVisibility.PUBLIC,
    });
  }
  if (
    user.privacySettings.city === PrivacyVisibility.PUBLIC &&
    user.country
  ) {
    query.$or.push({
      country: user.country,
      'privacySettings.country': PrivacyVisibility.PUBLIC,
    });
  }
  if (
    user.privacySettings.profession === PrivacyVisibility.PUBLIC &&
    user.profession
  ) {
    query.$or.push({
      profession: user.profession,
      'privacySettings.profession': PrivacyVisibility.PUBLIC,
    });
  }
  //agerange
  if(user.privacySettings.ageRange === PrivacyVisibility.PUBLIC && user.ageRange) {
    query.$or.push({
      ageRange: user.ageRange,
      'privacySettings.ageRange': PrivacyVisibility.PUBLIC,
    });
  }

  // If no matching attributes are available, return empty result
  if (query.$or.length === 0) {
    return {
      results: [],
      page: 1,
      limit: 10,
      totalPages: 0,
      totalResults: 0,
    };
  }

  // Set pagination options
  options.select = '_id fullName profileImage username';
  options.sortBy = options.sortBy || '-createdAt';

  // Fetch paginated users matching the query
  const paginatedResult = await User.paginate(query, options);

  return {
    results: paginatedResult.results,
    page: paginatedResult.page,
    limit: paginatedResult.limit,
    totalPages: paginatedResult.totalPages,
    totalResults: paginatedResult.totalResults,
  };
};

export const ConnectionsService = {
  addConnection,
  acceptConnection,
  declineConnection,
  removeConnection,
  cancelRequest,
  deleteConnection,
  getMyAllConnections,
  getMyAllRequests,
  getSentMyRequests,
  checkIsSentConnectionExists,
  getMutualConnections,
  checkConnectionStatus,
  getConnectionSuggestions,
};
