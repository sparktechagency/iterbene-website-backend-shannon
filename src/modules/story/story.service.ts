import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import {
  IStory,
  IStoryMedia,
  StoryPrivacy,
  StoryStatus,
  StoryMediaType,
  ReactionType,
} from './story.interface';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import ApiError from '../../errors/ApiError';
import { Story, StoryMedia } from './story.model';
import { Connections } from '../connections/connections.model';
import { Follower } from '../followers/followers.model';
import { User } from '../user/user.model';
import { ConnectionStatus } from '../connections/connections.interface';
import { uploadFilesToS3 } from '../../helpers/s3Service';
import { MessageService } from '../message/message.service';
import { IContent, IMessage, MessageType } from '../message/message.interface';
import { NotificationService } from '../notification/notification.services';
import { INotification } from '../notification/notification.interface';

const UPLOADS_FOLDER = 'uploads/stories';

const DEFAULT_STORY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to check story access permissions
const checkStoryAccess = async (
  story: IStory,
  userId: string
): Promise<boolean> => {
  // Owner always has access
  if (story.userId.equals(userId)) {
    return true;
  }

  // Check if story is public
  if (story.privacy === StoryPrivacy.PUBLIC) {
    return true;
  }

  // For followers privacy, check connections and followers
  if (story.privacy === StoryPrivacy.FOLLOWERS) {
    const [isFriend, isFollower] = await Promise.all([
      Connections.exists({
        $or: [
          { sentBy: story.userId, receivedBy: userId },
          { sentBy: userId, receivedBy: story.userId },
        ],
        status: ConnectionStatus.ACCEPTED,
      }),
      Follower.exists({
        followerId: userId,
        followedId: story.userId,
      }),
    ]);

    return !!(isFriend || isFollower);
  }

  return false;
};

// Create story with media
const createStory = async (
  userId: string,
  payload: {
    textContent?: string;
    backgroundColor?: string;
    textFontFamily: 'Arial';
    textColor: '#FFFFFF';
    textSize: '24';
    textPosition?: { x: number; y: number };
    privacy: StoryPrivacy;
    duration?: number;
  },
  files?: Express.Multer.File[]
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  const hasText = !!payload.textContent?.trim();
  const hasFiles = files && files.length > 0;

  if (!hasText && !hasFiles) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'At least one of textContent or media files is required'
    );
  }

  const duration =
    payload.duration && payload.duration > 0
      ? payload.duration
      : DEFAULT_STORY_DURATION;
  const expiresAt = new Date(Date.now() + duration);

  // Check if user has existing active story today
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  let existingStory = await Story.findOne({
    userId: new Types.ObjectId(userId),
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: StoryStatus.ACTIVE,
    isDeleted: false,
  });

  let mediaData: any[] = [];

  try {
    // Handle file uploads
    if (hasFiles) {
      const uploadPromises = files!.map(async file => {
        const mediaUrls = await uploadFilesToS3([file], UPLOADS_FOLDER);
        const fileMediaType = file.mimetype.startsWith('image')
          ? StoryMediaType.IMAGE
          : file.mimetype.startsWith('video')
          ? StoryMediaType.VIDEO
          : file.mimetype.startsWith('audio')
          ? StoryMediaType.AUDIO
          : StoryMediaType.DOCUMENT;

        return {
          mediaType: hasText ? StoryMediaType.MIXED : fileMediaType,
          mediaUrl: mediaUrls[0],
          textContent: payload.textContent || null,
          textFontFamily: payload.textFontFamily || null,
          backgroundColor: payload.backgroundColor || null,
          textColor: payload.textColor || null,
          textSize: payload.textSize || null,
          textPosition: payload.textPosition || null,
          expiresAt,
          viewedBy: [],
          viewCount: 0,
          reactions: [],
          replies: [],
          isDeleted: false,
        };
      });
      mediaData = await Promise.all(uploadPromises);
    } else if (hasText) {
      // Text-only story
      mediaData = [
        {
          mediaType: StoryMediaType.TEXT,
          mediaUrl: null,
          textPosition: payload.textPosition || null,
          textColor: payload.textColor || null,
          textSize: payload.textSize || null,
          textContent: payload.textContent,
          textFontFamily: payload.textFontFamily || null,
          backgroundColor: payload.backgroundColor || null,
          expiresAt,
          viewedBy: [],
          viewCount: 0,
          reactions: [],
          replies: [],
          isDeleted: false,
        },
      ];
    }

    // Create media documents
    const mediaDocs = await StoryMedia.create(mediaData);
    const mediaIds = mediaDocs.map(doc => doc._id);

    let story: IStory;
    if (existingStory) {
      // Add to existing story
      const latestExpiresAt = Math.max(
        expiresAt.getTime(),
        existingStory.expiresAt.getTime()
      );
      const updatedStory = await Story.findByIdAndUpdate(
        existingStory._id,
        {
          $push: { mediaIds: { $each: mediaIds } },
          expiresAt: new Date(latestExpiresAt),
          privacy: payload.privacy || existingStory.privacy,
        },
        { new: true }
      ).populate([
        {
          path: 'mediaIds',
          match: { isDeleted: false },
        },
        {
          path: 'userId',
          select: 'firstName lastName username nickname profileImage',
        },
      ]);
      if (!updatedStory) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Story not found after update'
        );
      }
      story = updatedStory;
    } else {
      // Create new story
      story = await Story.create({
        userId: new Types.ObjectId(userId),
        mediaIds,
        privacy: payload.privacy || StoryPrivacy.PUBLIC,
        status: StoryStatus.ACTIVE,
        expiresAt,
        isDeleted: false,
      });

      const populatedStory = await Story.findById(story._id).populate([
        {
          path: 'mediaIds',
          match: { isDeleted: false },
        },
        {
          path: 'userId',
          select: 'firstName lastName username nickname profileImage',
        },
      ]);
      if (!populatedStory) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Story not found after creation'
        );
      }
      story = populatedStory;
    }

    return story;
  } catch (error) {
    // Cleanup on error
    if (mediaData.length > 0) {
      const createdMediaIds = mediaData.map(m => m._id).filter(Boolean);
      if (createdMediaIds.length > 0) {
        await StoryMedia.deleteMany({ _id: { $in: createdMediaIds } });
      }
    }
    throw error instanceof ApiError
      ? error
      : new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to create story'
        );
  }
};

// Get single story media by mediaId
const getStoryMedia = async (
  mediaId: string,
  userId: string
): Promise<{
  media: IStoryMedia;
  story: IStory;
  totalMediaCount: number;
  currentIndex: number;
}> => {
  if (!Types.ObjectId.isValid(mediaId) || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid media ID or user ID');
  }

  // Find the specific media
  const media = await StoryMedia.findOne({
    _id: mediaId,
    expiresAt: { $gt: new Date() },
    isDeleted: false,
  }).populate([
    {
      path: 'viewedBy',
      select: 'firstName lastName username nickname profileImage',
    },
    {
      path: 'reactions.userId',
      select: 'firstName lastName username nickname profileImage',
    },
  ]);

  if (!media) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found or expired');
  }

  // Find the story this media belongs to
  const story = await Story.findOne({
    mediaIds: mediaId,
    status: StoryStatus.ACTIVE,
    isDeleted: false,
  }).populate([
    {
      path: 'mediaIds',
      match: { expiresAt: { $gt: new Date() }, isDeleted: false },
      select: '_id createdAt mediaType',
    },
    {
      path: 'userId',
      select: 'firstName lastName username nickname profileImage',
    },
  ]);

  if (!story) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }

  // Check access permissions
  const hasAccess = await checkStoryAccess(story, userId);
  if (!hasAccess) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You do not have access to this story'
    );
  }

  // Calculate current index and total count
  const sortedMediaIds = story.mediaIds
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
    )
    .map(m => m._id.toString());

  const currentIndex = sortedMediaIds.indexOf(mediaId);
  const totalMediaCount = sortedMediaIds.length;

  return {
    media,
    story,
    totalMediaCount,
    currentIndex: currentIndex + 1, // 1-based index for frontend
  };
};

// View story media and increment view count
const viewStoryMedia = async (
  mediaId: string,
  userId: string
): Promise<{
  media: IStoryMedia;
  story: IStory;
  totalMediaCount: number;
  currentIndex: number;
  nextMediaId?: string;
  previousMediaId?: string;
}> => {
  const result = await getStoryMedia(mediaId, userId);
  const { media, story } = result;

  const alreadyViewed = media?.viewedBy?.find(v => String(v?.id) === userId);

  if (alreadyViewed || story?.userId?.id?.toString() === userId) {
    return result;
  }
  await StoryMedia.updateOne(
    { _id: mediaId },
    {
      $push: { viewedBy: userId },
      $inc: { viewCount: 1 },
    }
  );
  const sortedMediaIds = story.mediaIds
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
    )
    .map(m => m._id.toString());

  const currentIndex = sortedMediaIds.indexOf(mediaId);
  const nextMediaId =
    currentIndex < sortedMediaIds.length - 1
      ? sortedMediaIds[currentIndex + 1]
      : undefined;
  const previousMediaId =
    currentIndex > 0 ? sortedMediaIds[currentIndex - 1] : undefined;

  return {
    ...result,
    nextMediaId,
    previousMediaId,
  };
};

// Get story by storyId (returns first media)
const getStory = async (storyId: string, userId: string): Promise<IStory> => {
  if (!Types.ObjectId.isValid(storyId) || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid story ID or user ID');
  }

  const story = await Story.findOne({
    _id: storyId,
    status: StoryStatus.ACTIVE,
    isDeleted: false,
  }).populate([
    {
      path: 'mediaIds',
      match: { expiresAt: { $gt: new Date() }, isDeleted: false },
      select: '-createdAt -updatedAt -__v -isDeleted -expiresAt',
      populate: [
        {
          path: 'viewedBy',
          select: 'firstName lastName username nickname profileImage',
        },
        {
          path: 'reactions.userId',
          select: 'firstName lastName username nickname profileImage',
        },
      ],
    },
    {
      path: 'userId',
      select: 'firstName lastName username nickname profileImage',
    },
  ]);

  if (!story) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }

  if (story.mediaIds.length === 0) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'No active media found for this story'
    );
  }

  // Check access permissions
  const hasAccess = await checkStoryAccess(story, userId);
  if (!hasAccess) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You do not have access to this story'
    );
  }

  return story;
};

// React to story media
const reactToStoryMedia = async (
  mediaId: string,
  userId: string,
  reactionType: string
): Promise<IStoryMedia> => {
  if (!Types.ObjectId.isValid(mediaId) || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid media ID or user ID');
  }
  if (!Object.values(ReactionType).includes(reactionType as ReactionType)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Invalid reaction type. Must be one of: ${Object.values(
        ReactionType
      ).join(', ')}`
    );
  }
  const result = await getStoryMedia(mediaId, userId);
  const { media, story } = result;

  const existingReaction = media.reactions.find(
    reaction => reaction?.userId?.id?.toString() === userId
  );

  if (existingReaction) {
    return media;
  }
  await StoryMedia.updateOne(
    { _id: mediaId },
    { $push: { reactions: { userId, reactionType } } }
  );
  const reactor = await User.findById(userId);
  const notification: INotification = {
    senderId: userId,
    receiverId: story.userId._id?.toString(),
    title: `${reactor?.fullName ?? 'Someone'} reacted to your story`,
    message: `${
      reactor?.fullName ?? 'A user'
    } reacted with a ${reactionType?.toLowerCase()} to your story.`,
    type: 'story',
    linkId: story?._id || mediaId?.toString(),
    role: 'user',
    viewStatus: false,
    image: reactor?.profileImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await NotificationService?.addCustomNotification?.(
    'notification',
    notification,
    story.userId.toString()
  );

  const updatedMedia = await StoryMedia.findById(mediaId).populate([
    {
      path: 'viewedBy',
      select: 'firstName lastName username nickname profileImage',
    },
    {
      path: 'reactions.userId',
      select: 'firstName lastName username nickname profileImage',
    },
  ]);
  if (!updatedMedia) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found');
  }
  return updatedMedia;
};

// Reply to story media
const replyToStoryMedia = async (
  mediaId: string,
  userId: string,
  message: string
) => {
  if (!Types.ObjectId.isValid(mediaId) || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid media ID or user ID');
  }
  const story = await Story.findOne({
    mediaIds: mediaId,
    status: StoryStatus.ACTIVE,
    isDeleted: false,
  });
  if (!story) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }

  const media = await StoryMedia.findById(mediaId);
  if (!media) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found');
  }

  const content: IContent = {
    messageType: MessageType.STORYMESSAGE,
    text: message || '',
    fileUrls: [],
  };
  const messagePayload: IMessage = {
    senderId: new Types.ObjectId(userId),
    receiverId: new Types.ObjectId(story.userId),
    storyMedia: new Types.ObjectId(mediaId),
    content,
  };
  const result = await MessageService.sendMessage(messagePayload);

  return result;
};

// Delete entire story
const deleteStory = async (userId: string, mediaId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(mediaId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID or media ID');
  }
  const story = await Story.findOne({
    mediaIds: mediaId,
    status: StoryStatus.ACTIVE,
    isDeleted: false,
  });
  if (!story) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
  }
  //remove this media from story
  //also remove media from StoryMedia collection
  const media = await StoryMedia.findById(mediaId);
  if (!media) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found');
  }
  media.isDeleted = true;
  await media.save();
  await Story.updateOne({ _id: story._id }, { $pull: { mediaIds: mediaId } });
  return;
};

// Delete single media from story
const deleteStoryMedia = async (
  userId: string,
  mediaId: string
): Promise<void> => {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(mediaId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID or media ID');
  }

  const result = await getStoryMedia(mediaId, userId);

  if (!result.story.userId.equals(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the creator can delete media'
    );
  }

  // Soft delete the media
  await StoryMedia.updateOne({ _id: mediaId }, { isDeleted: true });

  // If this was the last media in the story, delete the story too
  const remainingMedia = await StoryMedia.countDocuments({
    _id: { $in: result.story.mediaIds },
    isDeleted: false,
    expiresAt: { $gt: new Date() },
  });

  if (remainingMedia === 0) {
    await Story.updateOne(
      { _id: result.story._id },
      { isDeleted: true, status: StoryStatus.DELETED }
    );
  }
};

// Get story feed for user with own stories prioritized at index 0
const getStoryFeed = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IStory>> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  const currentUser = await User.findById(userId).lean();
  if (!currentUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const locationName = currentUser?.locationName;
  const city = currentUser?.city;
  const country = currentUser?.country;

  // Get user's connections and followers
  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  }).lean();
  const friendIds = connections.map(conn =>
    conn.sentBy.toString() === userId ? conn.receivedBy : conn.sentBy
  );

  const followers = await Follower.find({ followerId: userId }).lean();
  const followedIds = followers.map(f => f.followedId);

  const socialUserIds = [...new Set([...friendIds, ...followedIds])];

  // Build query for public stories from location-matched users
  let publicStoryQuery: any = {
    privacy: StoryPrivacy.PUBLIC,
    isDeleted: false,
    status: StoryStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
    userId: { $ne: new Types.ObjectId(userId) }, // Exclude own stories from public query
  };

  const userMatch: any = {
    $or: [{ locationName: locationName }, { city: city }, { country: country }],
  };

  const matchedUsers = await User.find({
    _id: { $ne: userId },
    ...userMatch,
  })
    .select('_id')
    .lean();
  const matchedUserIds = matchedUsers.map(u => u._id);

  if (matchedUserIds.length > 0) {
    publicStoryQuery.userId = { $in: matchedUserIds };
  } else {
    publicStoryQuery = { _id: null }; // No matching users found
  }

  // Step 1: Get own stories first
  const ownStoriesQuery = {
    userId: new Types.ObjectId(userId),
    isDeleted: false,
    status: StoryStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
  };

  const ownStories = await Story.find(ownStoriesQuery)
    .populate([
      {
        path: 'mediaIds',
        match: { expiresAt: { $gt: new Date() }, isDeleted: false },
        select: '-createdAt -updatedAt -__v -isDeleted -expiresAt',
        populate: [
          {
            path: 'viewedBy',
            select: 'firstName lastName username nickname profileImage',
          },
          {
            path: 'reactions.userId',
            select: 'firstName lastName username nickname profileImage',
          },
        ],
      },
      {
        path: 'userId',
        select: 'firstName lastName username nickname profileImage coverImage',
      },
    ])
    .select('-isDeleted -updatedAt -__v')
    .sort({ createdAt: -1 })
    .lean();

  // Step 2: Get other stories (social connections + public)
  const otherStoriesQuery = {
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

  // Calculate pagination for other stories
  let otherStoriesLimit = options.limit || 10;
  let otherStoriesPage = options.page || 1;

  // If we have own stories and this is the first page, reduce the limit for other stories
  if (ownStories.length > 0 && otherStoriesPage === 1) {
    otherStoriesLimit = Math.max(1, otherStoriesLimit - ownStories.length);
  }

  const otherStoriesOptions = {
    ...options,
    limit: otherStoriesLimit,
    page: otherStoriesPage,
  };

  const otherStoriesResult = await Story.paginate(otherStoriesQuery, {
    ...otherStoriesOptions,
    populate: [
      {
        path: 'mediaIds',
        match: { expiresAt: { $gt: new Date() }, isDeleted: false },
        select: '-createdAt -updatedAt -__v -isDeleted -expiresAt',
        populate: [
          {
            path: 'viewedBy',
            select: 'firstName lastName username nickname profileImage',
          },
          {
            path: 'reactions.userId',
            select: 'firstName lastName username nickname profileImage',
          },
        ],
      },
      {
        path: 'userId',
        select: 'firstName lastName username nickname profileImage coverImage',
      },
    ],
    select: '-isDeleted -updatedAt -__v',
  });

  // Step 3: Combine results with own stories first
  let combinedResults: IStory[] = [];

  if (otherStoriesPage === 1) {
    // First page: own stories first, then other stories
    combinedResults = [...ownStories, ...otherStoriesResult.results];
  } else {
    // Subsequent pages: only other stories
    combinedResults = otherStoriesResult.results;
  }

  // Calculate total count
  const ownStoriesCount = ownStories.length;
  const totalOtherStories = otherStoriesResult.totalResults || 0;
  const totalResults = ownStoriesCount + totalOtherStories;

  // Calculate pagination info
  const totalPages = Math.ceil(totalResults / (options.limit || 10));

  return {
    results: combinedResults,
    totalResults,
    totalPages,
    page: otherStoriesPage,
    limit: options.limit || 10,
  };
};

// Get viewers of a story media
const getStoryMediaViewers = async (
  userId: string,
  mediaId: string
): Promise<any[]> => {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(mediaId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID or media ID');
  }
  const result = await getStoryMedia(mediaId, userId);

  if (!result.story.userId.equals(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the creator can view the viewers list'
    );
  }
  return result.media.viewedBy;
};

export const StoryService = {
  createStory,
  getStory,
  getStoryMedia,
  viewStoryMedia,
  reactToStoryMedia,
  replyToStoryMedia,
  deleteStory,
  deleteStoryMedia,
  getStoryFeed,
  getStoryMediaViewers,
};
