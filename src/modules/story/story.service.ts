import { ClientSession, Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { IStory, StoryPrivacy, StoryStatus } from './story.interface';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import ApiError from '../../errors/ApiError';
import { Media } from '../media/media.model';
import { MediaType, SourceType } from '../media/media.interface';
import { Story } from './story.model';
import { Connections } from '../connections/connections.model';
import { Follower } from '../followers/followers.model';
import { User } from '../user/user.model';
import { ConnectionStatus } from '../connections/connections.interface';
import { uploadFilesToS3 } from '../../helpers/s3Service';

const UPLOADS_FOLDER = 'uploads/stories';
const createStory = async (
  userId: string,
  payload: any,
  files?: Express.Multer.File[]
): Promise<IStory> => {
  // Validate input: require either textContent, files, or both
  const hasText = !!payload.textContent;
  const hasFiles = files && files.length > 0;

  if (!hasText && !hasFiles) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'At least one of textContent or media files is required'
    );
  }

  // Determine media type
  let mediaType: MediaType;
  if (hasText && !hasFiles) {
    mediaType = MediaType.TEXT;
  } else if (!hasText && hasFiles) {
    // Will infer from file.mimetype below
    mediaType = MediaType.IMAGE; // Default, overridden by file type
  } else {
    mediaType = MediaType.MIXED;
  }

  // Prepare media data
  let mediaData: any[] = [];

  if (hasFiles) {
    mediaData = await Promise.all(
      files!.map(async file => {
        const mediaUrl = await uploadFilesToS3([file], UPLOADS_FOLDER);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const fileMediaType = file.mimetype.startsWith('image')
          ? MediaType.IMAGE
          : file.mimetype.startsWith('video')
          ? MediaType.VIDEO
          : file.mimetype.startsWith('audio')
          ? MediaType.AUDIO
          : MediaType.DOCUMENT;
        return {
          sourceId: new Types.ObjectId(), // Temporary
          sourceType: SourceType.STORY,
          mediaType:
            mediaType === MediaType.MIXED ? MediaType.MIXED : fileMediaType,
          mediaUrl: mediaUrl[0],
          duration: payload.duration || 0,
          textContent: payload.textContent || null,
          textFontFamily: payload.textFontFamily || null,
          backgroundColor: payload.backgroundColor || null,
          expiresAt,
          isDeleted: false,
        };
      })
    );
  } else if (hasText) {
    // Text-only media
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    mediaData = [
      {
        sourceId: new Types.ObjectId(), // Temporary
        sourceType: SourceType.STORY,
        mediaType: MediaType.TEXT,
        mediaUrl: null,
        duration: payload.duration || 0,
        textContent: payload.textContent,
        textFontFamily: payload?.textFontFamily || null,
        backgroundColor: payload.backgroundColor,
        expiresAt,
        isDeleted: false,
      },
    ];
  }

  // Check for existing active story for today
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  let story = await Story.findOne({
    userId: new Types.ObjectId(userId),
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: StoryStatus.ACTIVE,
    isDeleted: false,
  });

  let mediaDocs;
  if (story) {
    // Append to existing story
    mediaDocs = await Media.create(mediaData);
    story.mediaIds.push(...mediaDocs.map(m => m._id));
    // Update story.expiresAt to the latest media.expiresAt
    const latestExpiresAt = Math.max(
      ...mediaDocs.map(m => m.expiresAt?.getTime() ?? 0),
      story.expiresAt.getTime()
    );
    story.expiresAt = new Date(latestExpiresAt);
    story.privacy = payload.privacy || story.privacy;
    await story.save();
  } else {
    // Create new story
    mediaDocs = await Media.create(mediaData);
    const latestExpiresAt = Math.max(
      ...mediaDocs.map(m => m.expiresAt?.getTime() ?? 0)
    );
    const createdStories = await Story.create([
      {
        userId: new Types.ObjectId(userId),
        mediaIds: mediaDocs.map(m => m._id),
        privacy: payload.privacy || StoryPrivacy.FOLLOWERS,
        viewedBy: [],
        viewCount: 0,
        reactions: [],
        replies: [],
        status: StoryStatus.ACTIVE,
        expiresAt: new Date(latestExpiresAt),
        isDeleted: false,
      },
    ]);
    story = createdStories[0];
  }

  // Update media sourceIds
  await Promise.all(
    mediaDocs.map(media =>
      Media.updateOne({ _id: media._id }, { sourceId: story._id })
    )
  );

  return story;
};

const getStory = async (storyId: string, userId: string): Promise<IStory> => {
  const story = await Story.findById(storyId).populate([
    {
      path: 'mediaIds',
      select:
        '_id mediaType mediaUrl  duration textContent textFontFamily backgroundColor caption',
      match: { expiresAt: { $gt: new Date() }, isDeleted: false },
    },
    {
      path: 'userId',
      select: 'firstName lastName username nickname profileImage coverImage',
    },
  ]);
  if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }
  if (story.status === StoryStatus.EXPIRED) {
    throw new ApiError(StatusCodes.GONE, 'Story has expired');
  }
  if (story.userId.equals(userId)) {
    return story;
  }
  const isFriend = await Connections.exists({
    $or: [
      { sentBy: story.userId, receivedBy: userId },
      { sentBy: userId, receivedBy: story.userId },
    ],
  });
  const isFollower = await Follower.exists({
    followerId: userId,
    followedId: story.userId,
  });
  if (
    story.privacy === StoryPrivacy.PUBLIC ||
    (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
  ) {
    return story;
  }
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'You do not have access to this story'
  );
};

const deleteStory = async (
  userId: string,
  storyId: string
): Promise<IStory> => {
  const story = await Story.findById(storyId);
  if (!story || story.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }
  if (!story.userId.equals(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the creator can delete the story'
    );
  }
  story.isDeleted = true;
  story.status = StoryStatus.DELETED;
  await story.save();
  await Media.updateMany({ _id: { $in: story.mediaIds } }, { isDeleted: true });
  return story;
};

const viewStory = async (userId: string, storyId: string): Promise<IStory> => {
  const story = await Story.findById(storyId);
  if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }
  if (story.status === StoryStatus.EXPIRED) {
    throw new ApiError(StatusCodes.GONE, 'Story has expired');
  }
  if (story.userId.equals(userId)) {
    return story;
  }
  const isFriend = await Connections.exists({
    $or: [
      { sentBy: story.userId, receivedBy: userId },
      { sentBy: userId, receivedBy: story.userId },
    ],
  });
  const isFollower = await Follower.exists({
    followerId: userId,
    followedId: story.userId,
  });
  if (
    story.privacy === StoryPrivacy.PUBLIC ||
    (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
  ) {
    const userObjectId = new Types.ObjectId(userId);
    if (!story.viewedBy.includes(userObjectId)) {
      story.viewedBy.push(userObjectId);
      story.viewCount += 1;
      await story.save();
    }
    return story;
  }
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'You do not have access to this story'
  );
};

const reactToStory = async (
  userId: string,
  storyId: string,
  reactionType: string
): Promise<IStory> => {
  const story = await Story.findById(storyId);
  if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }
  if (story.status === StoryStatus.EXPIRED) {
    throw new ApiError(StatusCodes.GONE, 'Story has expired');
  }
  if (story.userId.equals(userId)) {
    const userObjectId = new Types.ObjectId(userId);
    const existingReaction = story.reactions.find(r =>
      r.userId.equals(userObjectId)
    );
    if (existingReaction) {
      existingReaction.reactionType = reactionType;
    } else {
      story.reactions.push({ userId: userObjectId, reactionType });
    }
    await story.save();
    return story;
  }
  const isFriend = await Connections.exists({
    $or: [
      { sentBy: story.userId, receivedBy: userId },
      { sentBy: userId, receivedBy: story.userId },
    ],
  });
  const isFollower = await Follower.exists({
    followerId: userId,
    followedId: story.userId,
  });
  if (
    story.privacy === StoryPrivacy.PUBLIC ||
    (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
  ) {
    const userObjectId = new Types.ObjectId(userId);
    const existingReaction = story.reactions.find(r =>
      r.userId.equals(userObjectId)
    );
    if (existingReaction) {
      existingReaction.reactionType = reactionType;
    } else {
      story.reactions.push({ userId: userObjectId, reactionType });
    }
    await story.save();
    return story;
  }
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'You do not have access to this story'
  );
};

const replyToStory = async (
  userId: string,
  storyId: string,
  message: string
): Promise<IStory> => {
  const story = await Story.findById(storyId);
  if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }
  if (story.status === StoryStatus.EXPIRED) {
    throw new ApiError(StatusCodes.GONE, 'Story has expired');
  }
  if (story.userId.equals(userId)) {
    story.replies.push({
      userId: new Types.ObjectId(userId),
      message,
      createdAt: new Date(),
    });
    await story.save();
    return story;
  }
  const isFriend = await Connections.exists({
    $or: [
      { sentBy: story.userId, receivedBy: userId },
      { sentBy: userId, receivedBy: story.userId },
    ],
  });
  const isFollower = await Follower.exists({
    followerId: userId,
    followedId: story.userId,
  });
  if (
    story.privacy === StoryPrivacy.PUBLIC ||
    (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
  ) {
    story.replies.push({
      userId: new Types.ObjectId(userId),
      message,
      createdAt: new Date(),
    });
    await story.save();
    return story;
  }
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'You do not have access to this story'
  );
};

const getMyStories = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IStory>> => {
  const query = {
    ...filters,
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  };
  options.populate = [
    {
      path: 'mediaIds',
      select:
        '_id mediaType mediaUrl  duration textContent textFontFamily backgroundColor caption',
      match: { expiresAt: { $gt: new Date() }, isDeleted: false },
    },
    {
      path: 'userId',
      select: 'firstName lastName username nickname profileImage coverImage',
    },
    {
      path: 'viewedBy',
      select: 'firstName lastName username nickname profileImage coverImage',
    },
    {
      path: 'reactions.userId',
      select: 'firstName lastName username nickname profileImage coverImage',
    },
    {
      path: 'replies.userId',
      select: 'firstName lastName username nickname profileImage coverImage',
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';
  return Story.paginate(query, options);
};

const getStoryFeed = async (
  userId: string,
  filters: { city?: string; country?: string; ageRange?: [number, number] },
  options: PaginateOptions
): Promise<PaginateResult<IStory>> => {
  const currentUser = await User.findById(userId);
  if (!currentUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Use logged-in user's attributes if filters are not provided
  const city = filters.city || currentUser.city;
  const country = filters.country || currentUser.country;

  // Get friends (bidirectional connections)
  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  });
  const friendIds = connections.map(conn =>
    conn.sentBy.toString() === userId ? conn.receivedBy : conn.sentBy
  );

  // Get followed users
  const followers = await Follower.find({ followerId: userId });
  const followedIds = followers.map(f => f.followedId);

  // Combine friend and followed user IDs
  const socialUserIds = [...new Set([...friendIds, ...followedIds,new Types.ObjectId(userId)])];

  console.log('Social User Ids', socialUserIds);

  // Build query for public stories with matching criteria
  let publicStoryQuery: any = {
    privacy: StoryPrivacy.PUBLIC,
    isDeleted: false,
    status: StoryStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
  };

  // Match user attributes
  const userMatch: any = {
    city,
    country,
  };

  // Find users matching the criteria
  const matchedUsers = await User.find({
    _id: { $ne: userId },
    ...userMatch,
  }).select('_id');
  const matchedUserIds = matchedUsers.map(u => u._id);

  if (matchedUserIds.length > 0) {
    publicStoryQuery.userId = { $in: matchedUserIds };
  } else {
    publicStoryQuery = { _id: null }; // No matching users, exclude public stories
  }

  // If no connections or followers, only return matching public stories
  if (friendIds.length === 0 && followedIds.length === 0) {
    console.log('This Api Hit');
    return Story.paginate(publicStoryQuery, {
      ...options,
      populate: [
        {
          path: 'mediaIds',
          select:
            '_id mediaType mediaUrl  duration textContent textFontFamily backgroundColor caption',
          match: { expiresAt: { $gt: new Date() }, isDeleted: false },
        },
        {
          path: 'userId',
          select:
            'firstName lastName username nickname profileImage coverImage',
        },
      ],
      select: '-isDeleted  -updatedAt -__v',
    });
  }

  // Combine queries for users with connections
  const query = {
    $or: [
      publicStoryQuery,
      {
        userId: { $in: socialUserIds },
        isDeleted: false,
        status: StoryStatus.ACTIVE,
        expiresAt: { $gt: new Date() },
        $or: [
          { privacy: StoryPrivacy.PUBLIC },
          { privacy: StoryPrivacy.FOLLOWERS },
        ],
      },
    ],
  };
  console.log('This Api Hit outside', query);
  return Story.paginate(query, {
    ...options,
    populate: [
      {
        path: 'mediaIds',
        select:
          '_id mediaType mediaUrl  duration textContent textFontFamily backgroundColor caption',
        match: { expiresAt: { $gt: new Date() }, isDeleted: false },
      },
      {
        path: 'userId',
        select: 'firstName lastName username nickname profileImage coverImage',
      },
    ],
    select: '-isDeleted  -updatedAt -__v',
  });
};

const getStoryViewers = async (
  userId: string,
  storyId: string
): Promise<Types.ObjectId[]> => {
  const story = await Story.findById(storyId).populate({
    path: 'viewedBy',
    select: 'firstName lastName username  profileImage',
  });
  if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }
  if (!story.userId.equals(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the creator can view the viewers list'
    );
  }

  return story.viewedBy;
};

export const StoryService = {
  createStory,
  getStory,
  deleteStory,
  viewStory,
  reactToStory,
  replyToStory,
  getMyStories,
  getStoryFeed,
  getStoryViewers,
};
