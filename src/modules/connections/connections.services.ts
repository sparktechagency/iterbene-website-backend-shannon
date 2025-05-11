import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { User } from '../user/user.model';
import { Connections } from './connections.model';
import { ConnectionStatus, IConnections } from './connections.interface';
import mongoose from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { UserService } from '../user/user.service';
import { validateUsers } from '../../utils/validateUsers';
import { ConnectionPrivacy, PrivacyVisibility } from '../user/user.interface';
import { BlockedUser } from '../blockedUsers/blockedUsers.model';

const addConnection = async (
  sentByUserId: string,
  receivedByUserId: string
) => {
  const { user1: sentByUser, user2: receivedByUser } = await validateUsers(
    sentByUserId,
    receivedByUserId,
    'Connect'
  );

  if (receivedByUser.connectionPrivacy === ConnectionPrivacy.PUBLIC) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This user does not accept connection requests'
    );
  }

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
  limit: number = 10,
  options: { skip?: number; sortBy?: string } = {}
): Promise<{ users: any[]; total: number }> => {
  const user = await User.findById(userId).select(
    'city locationName profession age privacySettings connectionPrivacy'
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const friends = connections.map(conn =>
    conn.sentBy.toString() === userId
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );

  const pendingOrDeclined = await Connections.find({
    $or: [
      {
        sentBy: userId,
        status: { $in: [ConnectionStatus.PENDING, ConnectionStatus.DECLINED] },
      },
      {
        receivedBy: userId,
        status: { $in: [ConnectionStatus.PENDING, ConnectionStatus.DECLINED] },
      },
    ],
  }).select('sentBy receivedBy');

  const blockedUsers = await BlockedUser.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  }).select('blockerId blockedId');

  const blockedUserIds = blockedUsers.map(block =>
    block.blockerId.toString() === userId
      ? block.blockedId.toString()
      : block.blockerId.toString()
  );

  const excludeUsers = [
    userId,
    ...friends,
    ...blockedUserIds,
    ...pendingOrDeclined.map(conn =>
      conn.sentBy.toString() === userId
        ? conn.receivedBy.toString()
        : conn.sentBy.toString()
    ),
  ];

  let suggestedUsers: any[] = [];
  let total = 0;

  if (friends.length === 0) {
    const hasAttributes =
      (user.privacySettings.city === PrivacyVisibility.PUBLIC && user.city) ||
      (user.privacySettings.locationName === PrivacyVisibility.PUBLIC &&
        user.locationName) ||
      (user.privacySettings.profession === PrivacyVisibility.PUBLIC &&
        user.profession) ||
      (user.privacySettings.age === PrivacyVisibility.PUBLIC && user.age);

    if (!hasAttributes) {
      return { users: [], total: 0 };
    }

    const query: Record<string, any> = {
      _id: { $nin: excludeUsers.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
      isBanned: false,
      isBlocked: false,
      $or: [],
    };

    if (user.privacySettings.city === PrivacyVisibility.PUBLIC && user.city) {
      query.$or.push({
        city: user.city,
        'privacySettings.city': PrivacyVisibility.PUBLIC,
      });
    }
    if (
      user.privacySettings.locationName === PrivacyVisibility.PUBLIC &&
      user.locationName
    ) {
      query.$or.push({
        locationName: user.locationName,
        'privacySettings.locationName': PrivacyVisibility.PUBLIC,
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
    if (user.privacySettings.age === PrivacyVisibility.PUBLIC && user.age) {
      query.$or.push({
        age: { $gte: user.age - 10, $lte: user.age + 10 },
        'privacySettings.age': PrivacyVisibility.PUBLIC,
      });
    }

    if (query.$or.length === 0) {
      return { users: [], total: 0 };
    }

    suggestedUsers = await User.find(query)
      .select(
        'username firstName lastName profileImage city locationName profession age'
      )
      .skip(options.skip || 0)
      .limit(limit)
      .sort(options.sortBy || '-createdAt');

    total = await User.countDocuments(query);
  } else {
    const friendConnections = await Connections.find({
      $or: [{ sentBy: { $in: friends } }, { receivedBy: { $in: friends } }],
      status: ConnectionStatus.ACCEPTED,
    }).select('sentBy receivedBy');

    const friendOfFriends: { [key: string]: number } = {};
    friendConnections.forEach(conn => {
      const otherUser =
        conn.sentBy.toString() === userId
          ? conn.receivedBy.toString()
          : conn.sentBy.toString();
      if (!excludeUsers.includes(otherUser)) {
        friendOfFriends[otherUser] = (friendOfFriends[otherUser] || 0) + 1;
      }
    });

    const suggestedUserIds = Object.keys(friendOfFriends)
      .sort((a, b) => friendOfFriends[b] - friendOfFriends[a])
      .slice(0, 100);

    const query: Record<string, any> = {
      _id: { $in: suggestedUserIds.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
      isBanned: false,
      isBlocked: false,
      $or: [],
    };

    if (user.privacySettings.city === PrivacyVisibility.PUBLIC && user.city) {
      query.$or.push({
        city: user.city,
        'privacySettings.city': PrivacyVisibility.PUBLIC,
      });
    }
    if (
      user.privacySettings.locationName === PrivacyVisibility.PUBLIC &&
      user.locationName
    ) {
      query.$or.push({
        locationName: user.locationName,
        'privacySettings.locationName': PrivacyVisibility.PUBLIC,
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
    if (user.privacySettings.age === PrivacyVisibility.PUBLIC && user.age) {
      query.$or.push({
        age: { $gte: user.age - 10, $lte: user.age + 10 },
        'privacySettings.age': PrivacyVisibility.PUBLIC,
      });
    }

    if (query.$or.length > 0) {
      suggestedUsers = await User.find(query)
        .select(
          'username firstName lastName profileImage city locationName profession age'
        )
        .skip(options.skip || 0)
        .limit(limit)
        .sort(options.sortBy || '-createdAt');
      total = await User.countDocuments(query);
    } else {
      suggestedUsers = await User.find({
        _id: {
          $in: suggestedUserIds.map(id => new mongoose.Types.ObjectId(id)),
        },
      })
        .select(
          'username firstName lastName profileImage city locationName profession age'
        )
        .skip(options.skip || 0)
        .limit(limit)
        .sort(options.sortBy || '-createdAt');
      total = suggestedUserIds.length;
    }

    suggestedUsers = await Promise.all(
      suggestedUsers.map(async suggestedUser => {
        const filteredUser = await UserService.filterUserFields(
          suggestedUser,
          userId
        );
        return filteredUser;
      })
    );
  }

  return {
    users: suggestedUsers,
    total,
  };
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
  getMutualConnections,
  checkConnectionStatus,
  getConnectionSuggestions,
};
