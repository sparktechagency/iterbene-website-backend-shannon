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

  if (
    sentByUser.blockedUsers?.includes(
      new mongoose.Types.ObjectId(receivedByUserId)
    )
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You have blocked this user');
  }
  if (
    receivedByUser.blockedUsers?.includes(
      new mongoose.Types.ObjectId(sentByUserId)
    )
  ) {
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

  if (
    blocker.blockedUsers?.includes(new mongoose.Types.ObjectId(blockedUserId))
  ) {
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
  limit: number = 10,
  options: { skip?: number; sortBy?: string } = {}
): Promise<{ users: any[]; total: number }> => {
  // Fetch the requesting user
  const user = await User.findById(userId).select(
    'blockedUsers city locationName profession age fullName'
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  console.log(user)

  // Get existing connections
  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const friends = connections.map(conn =>
    conn.sentBy.toString() === userId
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );

  // Get pending or declined connections to exclude
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

  const excludeUsers = [
    userId,
    ...friends,
    ...(user.blockedUsers?.map(id => id.toString()) || []),
    ...pendingOrDeclined.map(conn =>
      conn.sentBy.toString() === userId
        ? conn.receivedBy.toString()
        : conn.sentBy.toString()
    ),
  ];

  // Initialize suggestions array
  let suggestedUsers: any[] = [];
  let total = 0;

  // Step 1: For new users with no connections
  if (friends.length === 0) {
    // Check if user has any relevant profile attributes
    const hasAttributes =
      user.city || user.locationName || user.profession || user.age;

    // If no attributes and no connections, return empty (mimics Facebook for brand-new users)
    if (!hasAttributes) {
      return { users: [], total: 0 };
    }

    // Suggest based on profile attributes
    const query: Record<string, any> = {
      _id: { $nin: excludeUsers.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
      isBanned: false,
      isBlocked: false,
      $or: [],
    };

    // Add filters based on profile attributes
    if (user.city) {
      query.$or.push({ city: user.city });
    }
    if (user.locationName) {
      query.$or.push({ locationName: user.locationName });
    }
    if (user.profession) {
      query.$or.push({ profession: user.profession });
    }
    if (user.age) {
      query.$or.push({
        age: { $gte: user.age - 10, $lte: user.age + 10 }, 
      });
    }

    // Fetch users matching profile attributes
    suggestedUsers = await User.find(query)
      .select(
        'username firstName lastName profileImage city locationName profession age'
      )
      .skip(options.skip || 0)
      .limit(limit)
      .sort(options.sortBy || '-createdAt'); // Sort by newest users (mimics Facebook's active user bias)

    total = await User.countDocuments(query);
  } else {
    // Step 2: For users with connections, suggest friends of friends
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

    // Sort by number of mutual friends
    const suggestedUserIds = Object.keys(friendOfFriends)
      .sort((a, b) => friendOfFriends[b] - friendOfFriends[a])
      .slice(0, 100); // Limit to avoid performance issues

    // Step 3: Prioritize profile similarity
    const query: Record<string, any> = {
      _id: { $in: suggestedUserIds.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
      isBanned: false,
      isBlocked: false,
      $or: [],
    };

    if (user.city) {
      query.$or.push({ city: user.city });
    }
    if (user.locationName) {
      query.$or.push({ locationName: user.locationName });
    }
    if (user.profession) {
      query.$or.push({ profession: user.profession });
    }
    if (user.age) {
      query.$or.push({
        age: { $gte: user.age - 10, $lte: user.age + 10 },
      });
    }

    // Fetch users, prioritizing profile matches if attributes exist
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
      // Fallback to all friends of friends
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
  blockUser,
  unblockUser,
  getMutualConnections,
  checkConnectionStatus,
  getConnectionSuggestions,
};
