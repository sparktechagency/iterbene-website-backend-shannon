// import { Types } from 'mongoose';
// import { StatusCodes } from 'http-status-codes';
// import {
//   IStory,
//   StoryPrivacy,
//   StoryStatus,
//   StoryMediaType,
//   ReactionType,
// } from './story.interface';
// import { PaginateOptions, PaginateResult } from '../../types/paginate';
// import ApiError from '../../errors/ApiError';
// import { Story, StoryMedia } from './story.model';
// import { Connections } from '../connections/connections.model';
// import { Follower } from '../followers/followers.model';
// import { User } from '../user/user.model';
// import { ConnectionStatus } from '../connections/connections.interface';
// import { uploadFilesToS3 } from '../../helpers/s3Service';

// const UPLOADS_FOLDER = 'uploads/stories';
// const MAX_REPLY_LENGTH = 500; // Max length for reply messages

// const createStory = async (
//   userId: string,
//   payload: {
//     textContent?: string;
//     textFontFamily?: string;
//     backgroundColor?: string;
//     duration?: number;
//     privacy?: string;
//   },
//   files?: Express.Multer.File[]
// ) => {
//   if (!Types.ObjectId.isValid(userId)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
//   }
//   if (payload.privacy && !Object.values(StoryPrivacy).includes(payload.privacy as StoryPrivacy)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid privacy setting');
//   }

//   const hasText = !!payload.textContent;
//   const hasFiles = files && files.length > 0;

//   if (!hasText && !hasFiles) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'At least one of textContent or media files is required'
//     );
//   }

//   let mediaType: StoryMediaType;
//   if (hasText && !hasFiles) {
//     mediaType = StoryMediaType.TEXT;
//   } else if (!hasText && hasFiles) {
//     mediaType = StoryMediaType.IMAGE;
//   } else {
//     mediaType = StoryMediaType.MIXED;
//   }

//   const duration = payload.duration && payload.duration > 0 ? payload.duration : 24 * 60 * 60 * 1000; // Default 24 hours
//   let mediaData: any[] = [];
//   if (hasFiles) {
//     try {
//       mediaData = await Promise.all(
//         files!.map(async file => {
//           const mediaUrl = await uploadFilesToS3([file], UPLOADS_FOLDER);
//           const expiresAt = new Date(Date.now() + duration);
//           const fileMediaType = file.mimetype.startsWith('image')
//             ? StoryMediaType.IMAGE
//             : file.mimetype.startsWith('video')
//             ? StoryMediaType.VIDEO
//             : file.mimetype.startsWith('audio')
//             ? StoryMediaType.AUDIO
//             : StoryMediaType.DOCUMENT;
//           return {
//             mediaType: mediaType === StoryMediaType.MIXED ? StoryMediaType.MIXED : fileMediaType,
//             mediaUrl: mediaUrl[0],
//             textContent: payload.textContent || null,
//             textFontFamily: payload.textFontFamily || null,
//             backgroundColor: payload.backgroundColor || null,
//             expiresAt,
//             viewedBy: [],
//             viewCount: 0,
//             reactions: [],
//             replies: [],
//             isDeleted: false,
//           };
//         })
//       );
//     } catch (uploadError) {
//       throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to upload media to S3');
//     }
//   } else if (hasText) {
//     const expiresAt = new Date(Date.now() + duration);
//     mediaData = [
//       {
//         mediaType: StoryMediaType.TEXT,
//         mediaUrl: null,
//         textContent: payload.textContent,
//         textFontFamily: payload.textFontFamily || null,
//         backgroundColor: payload.backgroundColor || null,
//         expiresAt,
//         viewedBy: [],
//         viewCount: 0,
//         reactions: [],
//         replies: [],
//         isDeleted: false,
//       },
//     ];
//   }

//   const startOfDay = new Date();
//   startOfDay.setUTCHours(0, 0, 0, 0);
//   const endOfDay = new Date();
//   endOfDay.setUTCHours(23, 59, 59, 999);

//   let story = await Story.findOne({
//     userId: new Types.ObjectId(userId),
//     createdAt: { $gte: startOfDay, $lte: endOfDay },
//     status: StoryStatus.ACTIVE,
//     isDeleted: false,
//   }).lean();

//   let mediaDocs;
//   try {
//     mediaDocs = await StoryMedia.create(mediaData);
//     if (story) {
//       const mediaIds = mediaDocs.map(m => m._id);
//       const latestExpiresAt = Math.max(
//         ...mediaDocs.map(m => m.expiresAt?.getTime() ?? 0),
//         story.expiresAt.getTime()
//       );
//       story = await Story.findByIdAndUpdate(
//         story._id,
//         {
//           $push: { mediaIds: { $each: mediaIds } },
//           expiresAt: new Date(latestExpiresAt),
//           privacy: payload.privacy || story.privacy,
//         },
//         { new: true }
//       );
//     } else {
//       const latestExpiresAt = Math.max(
//         ...mediaDocs.map(m => m.expiresAt?.getTime() ?? 0)
//       );
//       story = await Story.create({
//         userId: new Types.ObjectId(userId),
//         mediaIds: mediaDocs.map(m => m._id),
//         privacy: payload.privacy || StoryPrivacy.FOLLOWERS,
//         status: StoryStatus.ACTIVE,
//         expiresAt: new Date(latestExpiresAt),
//         isDeleted: false,
//       });
//     }
//   } catch (error) {
//     // Manual rollback: delete created media if story creation fails
//     if (mediaDocs) {
//       await StoryMedia.deleteMany({ _id: { $in: mediaDocs.map(m => m._id) } });
//     }
//     throw error instanceof ApiError ? error : new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create story');
//   }

//   return story;
// };

// const getStory = async (storyId: string, userId: string): Promise<IStory> => {
//   if (!Types.ObjectId.isValid(storyId) || !Types.ObjectId.isValid(userId)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid story ID or user ID');
//   }

//   const story = await Story.findById(storyId)
//     .populate([
//       {
//         path: 'mediaIds',
//         match: { expiresAt: { $gt: new Date() }, isDeleted: false },
//         populate: [
//           { path: 'viewedBy', select: 'firstName lastName username nickname profileImage' },
//           { path: 'reactions.userId', select: 'firstName lastName username nickname profileImage' },
//           { path: 'replies.userId', select: 'firstName lastName username nickname profileImage' },
//         ],
//       },
//       {
//         path: 'userId',
//         select: 'firstName lastName username nickname profileImage coverImage',
//       },
//     ])

//   if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
//   }
//   if (story.status === StoryStatus.EXPIRED) {
//     throw new ApiError(StatusCodes.GONE, 'Story has expired');
//   }
//   if (!story.mediaIds || story.mediaIds.length === 0) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'No active media found for this story');
//   }

//   if (story?.userId?.equals(userId)) {
//     return story;
//   }

//   const isFriend = await Connections.exists({
//     $or: [
//       { sentBy: story.userId, receivedBy: userId },
//       { sentBy: userId, receivedBy: story.userId },
//     ],
//     status: ConnectionStatus.ACCEPTED,
//   }).lean();
//   const isFollower = await Follower.exists({
//     followerId: userId,
//     followedId: story.userId,
//   }).lean();

//   if (
//     story.privacy === StoryPrivacy.PUBLIC ||
//     (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
//   ) {
//     return story;
//   }

//   throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this story');
// };

// const deleteStory = async (userId: string, storyId: string): Promise<IStory> => {
//   if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storyId)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID or story ID');
//   }

//   const story = await Story.findById(storyId).lean();
//   if (!story || story.isDeleted) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
//   }
//   if (!story.userId.equals(userId)) {
//     throw new ApiError(StatusCodes.FORBIDDEN, 'Only the creator can delete the story');
//   }

//   try {
//     const updatedStory = await Story.findByIdAndUpdate(
//       storyId,
//       { isDeleted: true, status: StoryStatus.DELETED },
//       { new: true }
//     ).lean();
//     await StoryMedia.updateMany({ _id: { $in: story.mediaIds } }, { isDeleted: true });
//     return updatedStory!;
//   } catch (error) {
//     throw error instanceof ApiError ? error : new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to delete story');
//   }
// };

// const viewStory = async (userId: string, storyId: string, mediaId?: string): Promise<IStory> => {
//   if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storyId) || (mediaId && !Types.ObjectId.isValid(mediaId))) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID, story ID, or media ID');
//   }

//   if (mediaId) {
//     const media = await StoryMedia.findOne({
//       _id: mediaId,
//       expiresAt: { $gt: new Date() },
//       isDeleted: false,
//     }).lean();
//     if (!media) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found or expired');
//     }

//     const story = await Story.findById(storyId).lean();
//     if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
//     }
//     if (story.status === StoryStatus.EXPIRED) {
//       throw new ApiError(StatusCodes.GONE, 'Story has expired');
//     }
//     if (!story.mediaIds.some(media => media._id && media._id.equals(mediaId))) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Media does not belong to this story');
//     }

//     if (story.userId.equals(userId)) {
//       if (!media.viewedBy.some(id => id.equals(userId))) {
//         await StoryMedia.updateOne(
//           { _id: mediaId },
//           { $push: { viewedBy: userId }, $inc: { viewCount: 1 } }
//         );
//       }
//       return getStory(storyId, userId); // Fetch full story with populated data
//     }

//     const isFriend = await Connections.exists({
//       $or: [
//         { sentBy: story.userId, receivedBy: userId },
//         { sentBy: userId, receivedBy: story.userId },
//       ],
//       status: ConnectionStatus.ACCEPTED,
//     }).lean();
//     const isFollower = await Follower.exists({
//       followerId: userId,
//       followedId: story.userId,
//     }).lean();

//     if (
//       story.privacy === StoryPrivacy.PUBLIC ||
//       (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
//     ) {
//       if (!media.viewedBy.some(id => id.equals(userId))) {
//         await StoryMedia.updateOne(
//           { _id: mediaId },
//           { $push: { viewedBy: userId }, $inc: { viewCount: 1 } }
//         );
//       }
//       return getStory(storyId, userId); // Fetch full story with populated data
//     }

//     throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this story');
//   }

//   return getStory(storyId, userId); // No mediaId, fetch full story
// };

// const reactToStory = async (
//   userId: string,
//   storyId: string,
//   reactionType: string,
//   mediaId?: string
// ): Promise<IStory> => {
//   if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storyId) || (mediaId && !Types.ObjectId.isValid(mediaId))) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID, story ID, or media ID');
//   }
//   if (!Object.values(ReactionType).includes(reactionType as ReactionType)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid reaction type. Must be one of: ${Object.values(ReactionType).join(', ')}`);
//   }

//   if (mediaId) {
//     const media = await StoryMedia.findOne({
//       _id: mediaId,
//       expiresAt: { $gt: new Date() },
//       isDeleted: false,
//     }).lean();
//     if (!media) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found or expired');
//     }

//     const story = await Story.findById(storyId).lean();
//     if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
//     }
//     if (story.status === StoryStatus.EXPIRED) {
//       throw new ApiError(StatusCodes.GONE, 'Story has expired');
//     }
//     if (!story.mediaIds.some(media => media._id && media._id.equals(mediaId))) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Media does not belong to this story');
//     }

//     if (story.userId.equals(userId)) {
//       await StoryMedia.updateOne(
//         { _id: mediaId, 'reactions.userId': userId },
//         { $set: { 'reactions.$.reactionType': reactionType } },
//         { upsert: true, arrayFilters: [{ 'reactions.userId': userId }] }
//       );
//       await StoryMedia.updateOne(
//         { _id: mediaId, 'reactions.userId': { $ne: userId } },
//         { $push: { reactions: { userId, reactionType } } }
//       );
//       return getStory(storyId, userId);
//     }

//     const isFriend = await Connections.exists({
//       $or: [
//         { sentBy: story.userId, receivedBy: userId },
//         { sentBy: userId, receivedBy: story.userId },
//       ],
//       status: ConnectionStatus.ACCEPTED,
//     }).lean();
//     const isFollower = await Follower.exists({
//       followerId: userId,
//       followedId: story.userId,
//     }).lean();

//     if (
//       story.privacy === StoryPrivacy.PUBLIC ||
//       (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
//     ) {
//       await StoryMedia.updateOne(
//         { _id: mediaId, 'reactions.userId': userId },
//         { $set: { 'reactions.$.reactionType': reactionType } },
//         { upsert: true, arrayFilters: [{ 'reactions.userId': userId }] }
//       );
//       await StoryMedia.updateOne(
//         { _id: mediaId, 'reactions.userId': { $ne: userId } },
//         { $push: { reactions: { userId, reactionType } } }
//       );
//       return getStory(storyId, userId);
//     }

//     throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this story');
//   }

//   return getStory(storyId, userId);
// };

// const replyToStory = async (
//   userId: string,
//   storyId: string,
//   message: string,
//   mediaId?: string
// ): Promise<IStory> => {
//   if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storyId) || (mediaId && !Types.ObjectId.isValid(mediaId))) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID, story ID, or media ID');
//   }
//   if (message.length > MAX_REPLY_LENGTH) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, `Reply message exceeds ${MAX_REPLY_LENGTH} characters`);
//   }

//   if (mediaId) {
//     const media = await StoryMedia.findOne({
//       _id: mediaId,
//       expiresAt: { $gt: new Date() },
//       isDeleted: false,
//     }).lean();
//     if (!media) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found or expired');
//     }

//     const story = await Story.findById(storyId).lean();
//     if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
//     }
//     if (story.status === StoryStatus.EXPIRED) {
//       throw new ApiError(StatusCodes.GONE, 'Story has expired');
//     }
//     if (!story.mediaIds.some(media => media._id && media._id.equals(mediaId))) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Media does not belong to this story');
//     }

//     if (story.userId.equals(userId)) {
//       await StoryMedia.updateOne(
//         { _id: mediaId },
//         { $push: { replies: { userId, message, createdAt: new Date() } } }
//       );
//       return getStory(storyId, userId);
//     }

//     const isFriend = await Connections.exists({
//       $or: [
//         { sentBy: story.userId, receivedBy: userId },
//         { sentBy: userId, receivedBy: story.userId },
//       ],
//       status: ConnectionStatus.ACCEPTED,
//     }).lean();
//     const isFollower = await Follower.exists({
//       followerId: userId,
//       followedId: story.userId,
//     }).lean();

//     if (
//       story.privacy === StoryPrivacy.PUBLIC ||
//       (story.privacy === StoryPrivacy.FOLLOWERS && (isFriend || isFollower))
//     ) {
//       await StoryMedia.updateOne(
//         { _id: mediaId },
//         { $push: { replies: { userId, message, createdAt: new Date() } } }
//       );
//       return getStory(storyId, userId);
//     }

//     throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this story');
//   }

//   return getStory(storyId, userId);
// };

// const getMyStories = async (
//   userId: string,
//   filters: Record<string, any>,
//   options: PaginateOptions
// ): Promise<PaginateResult<IStory>> => {
//   if (!Types.ObjectId.isValid(userId)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
//   }

//   const query = {
//     ...filters,
//     userId: new Types.ObjectId(userId),
//     isDeleted: false,
//   };
//   options.populate = [
//     {
//       path: 'mediaIds',
//       match: { expiresAt: { $gt: new Date() }, isDeleted: false },
//       populate: [
//         { path: 'viewedBy', select: 'firstName lastName username nickname profileImage' },
//         { path: 'reactions.userId', select: 'firstName lastName username nickname profileImage' },
//         { path: 'replies.userId', select: 'firstName lastName username nickname profileImage' },
//       ],
//     },
//     {
//       path: 'userId',
//       select: 'firstName lastName username nickname profileImage coverImage',
//     },
//   ];
//   options.sortBy = options.sortBy || '-createdAt';
//   const result = await Story.paginate(query, options);
//   if (result.results.length === 0) {
//     return { ...result, results: [] };
//   }
//   return result;
// };

// const getStoryFeed = async (
//   userId: string,
//   filters: { city?: string; country?: string; ageRange?: [number, number] },
//   options: PaginateOptions
// ): Promise<PaginateResult<IStory>> => {
//   if (!Types.ObjectId.isValid(userId)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
//   }

//   const currentUser = await User.findById(userId).lean();
//   if (!currentUser) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
//   }

//   const city = filters.city || currentUser.city;
//   const country = filters.country || currentUser.country;

//   const connections = await Connections.find({
//     $or: [{ sentBy: userId }, { receivedBy: userId }],
//     status: ConnectionStatus.ACCEPTED,
//   }).lean();
//   const friendIds = connections.map(conn =>
//     conn.sentBy.toString() === userId ? conn.receivedBy : conn.sentBy
//   );

//   const followers = await Follower.find({ followerId: userId }).lean();
//   const followedIds = followers.map(f => f.followedId);

//   const socialUserIds = [
//     ...new Set([...friendIds, ...followedIds, new Types.ObjectId(userId)]),
//   ];

//   let publicStoryQuery: any = {
//     privacy: StoryPrivacy.PUBLIC,
//     isDeleted: false,
//     status: StoryStatus.ACTIVE,
//     expiresAt: { $gt: new Date() },
//   };

//   const userMatch: any = { city, country };
//   if (filters.ageRange) {
//     userMatch.age = { $gte: filters.ageRange[0], $lte: filters.ageRange[1] };
//   }

//   const matchedUsers = await User.find({
//     _id: { $ne: userId },
//     ...userMatch,
//   })
//     .select('_id')
//     .lean();
//   const matchedUserIds = matchedUsers.map(u => u._id);

//   if (matchedUserIds.length > 0) {
//     publicStoryQuery.userId = { $in: matchedUserIds };
//   } else {
//     publicStoryQuery = { _id: null };
//   }

//   const query = {
//     $or: [
//       publicStoryQuery,
//       {
//         userId: { $in: socialUserIds },
//         isDeleted: false,
//         status: StoryStatus.ACTIVE,
//         expiresAt: { $gt: new Date() },
//         $or: [{ privacy: StoryPrivacy.PUBLIC }, { privacy: StoryPrivacy.FOLLOWERS }],
//       },
//     ],
//   };

//   const result = await Story.paginate(query, {
//     ...options,
//     populate: [
//       {
//         path: 'mediaIds',
//         match: { expiresAt: { $gt: new Date() }, isDeleted: false },
//         populate: [
//           { path: 'viewedBy', select: 'firstName lastName username nickname profileImage' },
//           { path: 'reactions.userId', select: 'firstName lastName username nickname profileImage' },
//           { path: 'replies.userId', select: 'firstName lastName username nickname profileImage' },
//         ],
//       },
//       {
//         path: 'userId',
//         select: 'firstName lastName username nickname profileImage coverImage',
//       },
//     ],
//     select: '-isDeleted -updatedAt -__v',
//   });

//   if (result.results.length === 0) {
//     return { ...result, results: [] };
//   }
//   return result;
// };

// const getStoryViewers = async (
//   userId: string,
//   storyId: string,
//   mediaId?: string
// ): Promise<Types.ObjectId[]> => {
//   if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storyId) || (mediaId && !Types.ObjectId.isValid(mediaId))) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID, story ID, or media ID');
//   }

//   const story = await Story.findById(storyId)
//     .populate({
//       path: 'mediaIds',
//       match: { expiresAt: { $gt: new Date() }, isDeleted: false },
//       select: 'viewedBy',
//       populate: { path: 'viewedBy', select: 'firstName lastName username profileImage' },
//     })
//     .lean();

//   if (!story || story.isDeleted || story.status === StoryStatus.DELETED) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Story not found');
//   }
//   if (!story.userId.equals(userId)) {
//     throw new ApiError(StatusCodes.FORBIDDEN, 'Only the creator can view the viewers list');
//   }

//   if (mediaId) {
//     const media = story.mediaIds.find(m => m._id.equals(mediaId));
//     if (!media) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Media not found or expired');
//     }
//     return media.viewedBy;
//   }

//   const allViewers = story.mediaIds.flatMap(m => m.viewedBy);
//   return [...new Set(allViewers)];
// };

// export const StoryService = {
//   createStory,
//   getStory,
//   deleteStory,
//   viewStory,
//   reactToStory,
//   replyToStory,
//   getMyStories,
//   getStoryFeed,
//   getStoryViewers,
// };

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
    textFontFamily?: string;
    backgroundColor?: string;
    duration?: number;
    privacy?: string;
  },
  files?: Express.Multer.File[]
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  if (
    payload.privacy &&
    !Object.values(StoryPrivacy).includes(payload.privacy as StoryPrivacy)
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid privacy setting');
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
    {
      path: 'replies.userId',
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

  // Increment view count if not already viewed by this user
  const alreadyViewed = media.viewedBy.some(viewerId =>
    viewerId._id ? viewerId._id.equals(userId) : viewerId.equals(userId)
  );

  if (!alreadyViewed) {
    await StoryMedia.updateOne(
      { _id: mediaId },
      {
        $push: { viewedBy: userId },
        $inc: { viewCount: 1 },
      }
    );
  }

  // Get navigation info for next/previous media
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
const getStory = async (
  storyId: string,
  userId: string
): Promise<{
  story: IStory;
  firstMediaId: string;
  totalMediaCount: number;
}> => {
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

  // Get first media ID (oldest)
  const sortedMedia = story.mediaIds.sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime()
  );

  return {
    story,
    firstMediaId: sortedMedia[0]._id.toString(),
    totalMediaCount: sortedMedia.length,
  };
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

  // Check if user already reacted
  const existingReactionIndex = result.media.reactions.findIndex(
    reaction => reaction.userId.toString() === userId
  );

  if (existingReactionIndex !== -1) {
    // Update existing reaction
    await StoryMedia.updateOne(
      { _id: mediaId, 'reactions.userId': userId },
      { $set: { 'reactions.$.reactionType': reactionType } }
    );
  } else {
    // Add new reaction
    await StoryMedia.updateOne(
      { _id: mediaId },
      { $push: { reactions: { userId, reactionType } } }
    );
  }

  // Return updated media
  const updatedMedia = await StoryMedia.findById(mediaId).populate([
    {
      path: 'viewedBy',
      select: 'firstName lastName username nickname profileImage',
    },
    {
      path: 'reactions.userId',
      select: 'firstName lastName username nickname profileImage',
    },
    {
      path: 'replies.userId',
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

  const content: IContent = {
    messageType: MessageType.TEXT,
    text: message || '', // Ensure message is set or empty string
    fileUrls: [], // Initialize fileUrls as an empty array
  };
  const messagePayload: IMessage = {
    senderId: new Types.ObjectId(userId),
    receiverId: new Types.ObjectId(story.userId),
    content,
  };
  const result = await MessageService.sendMessage(messagePayload);
  return result;
};

// Delete entire story
const deleteStory = async (userId: string, storyId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storyId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID or story ID');
  }

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

  // Soft delete story and all its media
  await Promise.all([
    Story.updateOne(
      { _id: storyId },
      { isDeleted: true, status: StoryStatus.DELETED }
    ),
    StoryMedia.updateMany(
      { _id: { $in: story.mediaIds } },
      { isDeleted: true }
    ),
  ]);
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

// Get story feed for user
const getStoryFeed = async (
  userId: string,
  filters: { city?: string; country?: string; ageRange?: [number, number] },
  options: PaginateOptions
): Promise<PaginateResult<IStory>> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  const currentUser = await User.findById(userId).lean();
  if (!currentUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const city = filters.city || currentUser.city;
  const country = filters.country || currentUser.country;

  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  }).lean();
  const friendIds = connections.map(conn =>
    conn.sentBy.toString() === userId ? conn.receivedBy : conn.sentBy
  );

  const followers = await Follower.find({ followerId: userId }).lean();
  const followedIds = followers.map(f => f.followedId);

  const socialUserIds = [
    ...new Set([...friendIds, ...followedIds, new Types.ObjectId(userId)]),
  ];

  let publicStoryQuery: any = {
    privacy: StoryPrivacy.PUBLIC,
    isDeleted: false,
    status: StoryStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
  };

  const userMatch: any = { city, country };
  if (filters.ageRange) {
    userMatch.age = { $gte: filters.ageRange[0], $lte: filters.ageRange[1] };
  }

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
    publicStoryQuery = { _id: null };
  }

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

  const result = await Story.paginate(query, {
    ...options,
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

  if (result.results.length === 0) {
    return { ...result, results: [] };
  }
  return result;
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
