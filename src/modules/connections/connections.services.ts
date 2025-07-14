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

  // Check for existing connection (any status)
  const existingConnection = await Connections.findOne({
    $or: [
      { sentBy: sentByUserId, receivedBy: receivedByUserId },
      { sentBy: receivedByUserId, receivedBy: sentByUserId },
    ],
  });

  if (existingConnection) {
    if (existingConnection.status === ConnectionStatus.ACCEPTED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Connection already exists');
    } else if (existingConnection.status === ConnectionStatus.PENDING) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Connection request already sent'
      );
    }
  }

  // Check connection privacy settings
  if (receivedByUser.connectionPrivacy === ConnectionPrivacy.FRIEND_TO_FRIEND) {
    const hasMutualFriends = await checkMutualFriends(
      sentByUserId,
      receivedByUserId
    );
    if (!hasMutualFriends) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You must have mutual friends to send a connection request'
      );
    }
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

  // Delete connection request on decline
  await Connections.findByIdAndDelete(connectionId);
  return connection;
};

const cancelRequest = async (userId: string, friendId: string) => {
  const connection = await Connections.findOne({
    sentBy: userId,
    receivedBy: friendId,
    status: ConnectionStatus.PENDING,
  });

  if (!connection) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Connection request not found');
  }

  const result = await Connections.findByIdAndDelete(connection._id);
  return result;
};

const deleteConnection = async (deleteByUserId: string, userId: string) => {
  const connection = await Connections.findOne({
    $or: [
      { sentBy: deleteByUserId, receivedBy: userId },
      { sentBy: userId, receivedBy: deleteByUserId },
    ],
  });

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

  const result = await Connections.findByIdAndDelete(connection._id);

  // Add to removed connections for temporary exclusion from suggestions
  await RemovedConnection.create({
    userId: userId,
    removedUserId: deleteByUserId,
  });

  return result;
};

const removeFromSuggestions = async (userId: string, removedUserId: string) => {
  // Check if already exists to avoid duplicates
  const existing = await RemovedConnection.findOne({
    userId,
    removedUserId,
  });

  if (!existing) {
    const result = await RemovedConnection.create({
      userId,
      removedUserId,
    });
    return result;
  }

  return existing;
};

// Helper function to check mutual friends
const checkMutualFriends = async (
  userId1: string,
  userId2: string
): Promise<boolean> => {
  const mutualFriends = await getMutualConnections(userId1, userId2);
  return mutualFriends.length > 0;
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

const checkIsSentConnectionExists = async (
  userId: string,
  friendId: string
) => {
  const connection = await Connections.findOne({
    $or: [
      { sentBy: userId, receivedBy: friendId },
      { sentBy: friendId, receivedBy: userId },
    ],
  });
  return connection;
};

const getMyAllConnections = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<any>> => {
  if (!filters.userId) {
    throw new Error('userId is required in filters');
  }

  const query = {
    status: ConnectionStatus.ACCEPTED,
    $or: [{ sentBy: filters.userId }, { receivedBy: filters.userId }],
  };

  options.populate = [
    {
      path: 'sentBy',
      select: 'fullName profileImage username',
    },
    {
      path: 'receivedBy',
      select: 'fullName profileImage username',
    },
  ];
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;
  const connections = await Connections.paginate(query, options);

  const transformedResults = connections.results.map((connection: any) => {
    const friend =
      connection.sentBy._id.toString() === filters.userId
        ? connection.receivedBy
        : connection.sentBy;

    return {
      _id: friend._id,
      fullName: friend.fullName,
      profileImage: friend.profileImage,
      username: friend.username,
    };
  });

  return {
    results: transformedResults,
    page: connections.page,
    limit: connections.limit,
    totalPages: connections.totalPages,
    totalResults: connections.totalResults,
  };
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
      select: 'fullName profileImage username',
    },
  ];
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;

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

  options.populate = [
    {
      path: 'receivedBy',
      select: 'fullName profileImage username',
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';

  const connections = await Connections.paginate(query, options);
  return connections;
};

const getConnectionSuggestions = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
) => {
  const user = await User.findById(userId).select(
    'city locationName country profession privacySettings connectionPrivacy ageRange'
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Get all user connections (any status)
  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
  }).select('sentBy receivedBy status');

  const connectedUserIds = connections.map(conn =>
    conn.sentBy.toString() === userId
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );

  // Get blocked users
  const blockedUsers = await BlockedUser.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  }).select('blockerId blockedId');

  const blockedUserIds = blockedUsers.map(block =>
    block.blockerId.toString() === userId
      ? block.blockedId.toString()
      : block.blockerId.toString()
  );

  // Get recently removed connections (exclude for 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const removedConnections = await RemovedConnection.find({
    userId,
    createdAt: { $gte: oneDayAgo }, // Only recent removals
  }).select('removedUserId');

  const removedUserIds = removedConnections.map(conn =>
    conn.removedUserId.toString()
  );

  // Exclude all connected, blocked, and recently removed users
  const excludeUsers = [
    userId,
    ...connectedUserIds,
    ...blockedUserIds,
    ...removedUserIds,
  ];

  const query: Record<string, any> = {
    _id: { $nin: excludeUsers.map(id => new mongoose.Types.ObjectId(id)) },
    isDeleted: false,
    isBanned: false,
    isBlocked: false,
    $or: [],
  };

  // // Build suggestions based on matching attributes
  // if (
  //   user.privacySettings.locationName === PrivacyVisibility.PUBLIC &&
  //   user.locationName
  // ) {
  //   query.$or.push({
  //     locationName: user.locationName,
  //     'privacySettings.locationName': PrivacyVisibility.PUBLIC,
  //   });
  // }
  // if (
  //   user.privacySettings.country === PrivacyVisibility.PUBLIC &&
  //   user.country
  // ) {
  //   query.$or.push({
  //     country: user.country,
  //     'privacySettings.country': PrivacyVisibility.PUBLIC,
  //   });
  // }
  // if (user.privacySettings.city === PrivacyVisibility.PUBLIC && user.city) {
  //   query.$or.push({
  //     city: user.city,
  //     'privacySettings.city': PrivacyVisibility.PUBLIC,
  //   });
  // }
  // if (
  //   user.privacySettings.ageRange === PrivacyVisibility.PUBLIC &&
  //   user.ageRange
  // ) {
  //   query.$or.push({
  //     ageRange: user.ageRange,
  //     'privacySettings.ageRange': PrivacyVisibility.PUBLIC,
  //   });
  // }
  // if (
  //   user.privacySettings.profession === PrivacyVisibility.PUBLIC &&
  //   user.profession
  // ) {
  //   query.$or.push({
  //     profession: user.profession,
  //     'privacySettings.profession': PrivacyVisibility.PUBLIC,
  //   });
  // }

  options.select = '_id fullName profileImage username';
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = 1;

  const paginatedResult = await User.paginate(query, options);

  return {
    results: paginatedResult.results,
    page: paginatedResult.page,
    limit: paginatedResult.limit,
    totalPages: paginatedResult.totalPages,
    totalResults: paginatedResult.totalResults,
  };
};

// Clean up old removed connections (run this as a cron job)
const cleanupOldRemovedConnections = async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await RemovedConnection.deleteMany({
    createdAt: { $lt: threeDaysAgo },
  });
};

export const ConnectionsService = {
  addConnection,
  acceptConnection,
  declineConnection,
  cancelRequest,
  deleteConnection,
  removeFromSuggestions,
  getMyAllConnections,
  getMyAllRequests,
  getSentMyRequests,
  checkIsSentConnectionExists,
  getMutualConnections,
  getConnectionSuggestions,
  cleanupOldRemovedConnections,
};
