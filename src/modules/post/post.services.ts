import { Types } from 'mongoose';
import { MediaType } from '../media/media.interface';
import { IPost, PostPrivacy, PostType, ReactionType } from './post.interface';
import ApiError from '../../errors/ApiError';
import Group from '../group/group.model';
import { Event } from '../event/event.model';
import { Itinerary } from '../Itinerary/itinerary.model';
import { Media } from '../media/media.model';
import { Hashtag } from '../hastag/hashtag.model';
import { Post } from './post.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { BlockedUser } from '../blockedUsers/blockedUsers.model';
import { ConnectionStatus } from '../connections/connections.interface';
import { Connections } from '../connections/connections.model';
import { Follower } from '../followers/followers.model';
import { User } from '../user/user.model';
import { Maps } from '../maps/maps.model';
import { uploadFilesToS3 } from '../../helpers/s3Service';

const UPLOADS_FOLDER = 'uploads/posts';
interface CreatePostPayload {
  userId: Types.ObjectId;
  content?: string;
  files?: Express.Multer.File[];
  itineraryId?: string;
  postType: PostType;
  privacy: PostPrivacy;
  sourceId?: string;
  visitedLocation?: { latitude: number; longitude: number };
  visitedLocationName?: string;
}

interface SharePostPayload {
  userId: Types.ObjectId;
  originalPostId: string;
  content?: string;
  privacy: PostPrivacy;
}

interface AddOrRemoveReactionPayload {
  userId: Types.ObjectId;
  postId: string;
  reactionType: ReactionType;
}

interface CreateCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  comment: string;
  replyTo?: string;
  parentCommentId?: string;
}

interface UpdateCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
  comment: string;
}

interface DeleteCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
}

interface GetUserMediaAndItinerariesPayload {
  userId: string;
  postType?: PostType;
  page: number;
  limit: number;
}

async function createPost(payload: CreatePostPayload): Promise<IPost> {
  const {
    userId,
    content,
    files,
    itineraryId,
    postType,
    privacy,
    sourceId,
    visitedLocation,
    visitedLocationName,
  } = payload;

  console.log("payload", payload);

  // Validate sourceId
  if (sourceId && postType === PostType.GROUP) {
    const group = await Group.findById(sourceId);
    if (!group || group.isDeleted) throw new ApiError(404, 'Group not found');
  }
  if (sourceId && postType === PostType.EVENT) {
    const event = await Event.findById(sourceId);
    if (!event || event.isDeleted) throw new ApiError(404, 'Event not found');
  }
  if (postType !== PostType.USER && !sourceId) {
    throw new ApiError(400, `${postType} posts require a sourceId`);
  }

  // Validate itineraryId
  let itinerary: Types.ObjectId | undefined;
  if (itineraryId) {
    const itineraryDoc = await Itinerary.findById(itineraryId);
    if (!itineraryDoc) throw new ApiError(404, 'Itinerary not found');
    if (itineraryDoc.postId)
      throw new ApiError(400, 'Itinerary already linked to a post');
    itinerary = itineraryDoc._id;
  }

  // Prepare media data
  let mediaData: any[] = [];
  if (files?.length) {
    mediaData = await Promise.all(
      files.map(async file => {
        const mediaUrl = await uploadFilesToS3([file], UPLOADS_FOLDER);
        const fileMediaType = file.mimetype.startsWith('image')
          ? MediaType.IMAGE
          : file.mimetype.startsWith('video')
          ? MediaType.VIDEO
          : file.mimetype.startsWith('audio')
          ? MediaType.AUDIO
          : MediaType.DOCUMENT;
        return {
          sourceId: new Types.ObjectId(), // Temporary
          sourceType: postType,
          mediaType: fileMediaType,
          mediaUrl:mediaUrl[0],
          isDeleted: false,
          metadata: { fileSize: file.size },
        };
      })
    );
  }

  // Create media
  const mediaDocs = await Media.insertMany(mediaData);

  // Process hashtags
  const normalizedHashtags = extractHashtags(content || '').map(tag =>
    tag.toLowerCase()
  );
  if (normalizedHashtags.length) {
    await Promise.all(
      normalizedHashtags.map(async tag => {
        await Hashtag.findOneAndUpdate(
          { _id: tag },
          {
            $setOnInsert: { name: tag, createdAt: new Date() },
            $inc: { postCount: 1 },
          },
          { upsert: true }
        );
      })
    );
  }

  // Create post
  const post = await Post.create({
    userId,
    sourceId: sourceId ? new Types.ObjectId(sourceId) : undefined,
    postType,
    content: content || '',
    media: mediaDocs?.map(m => m._id),
    itinerary,
    hashtags: normalizedHashtags,
    privacy,
    visitedLocation,
    visitedLocationName,
    shareCount: 0,
    isShared: false,
    itineraryViewCount: 0,
    sortedReactions: [],
    reactions: [],
    comments: [],
  });

  //add visited location to user
  const mapsUser = await Maps.findOne({ userId });
  if (mapsUser) {
    mapsUser.visitedLocation.push({
      latitude: visitedLocation?.latitude || 0,
      longitude: visitedLocation?.longitude || 0,
      visitedLocationName: visitedLocationName as string,
    });
    await mapsUser.save();
  } else {
    await Maps.create({
      userId,
      visitedLocation: [
        {
          latitude: visitedLocation?.latitude || 0,
          longitude: visitedLocation?.longitude || 0,
          visitedLocationName: visitedLocationName as string,
        },
      ],
      interestedLocation: [],
      latitude: visitedLocation?.latitude || 0,
      longitude: visitedLocation?.longitude || 0,
      visitedLocationName: visitedLocationName as string,
      interestedLocationName: '',
    });
  }

  // Update itinerary with postId
  if (itinerary) {
    await Itinerary.updateOne({ _id: itinerary }, { postId: post._id });
  }

  // Update hashtags with postId
  if (normalizedHashtags.length) {
    await Hashtag.updateMany(
      { _id: { $in: normalizedHashtags } },
      { $addToSet: { posts: post._id } }
    );
  }

  // Update media sourceIds
  await Promise.all(
    mediaDocs.map(media =>
      Media.updateOne({ _id: media._id }, { sourceId: post._id })
    )
  );

  // Update group/event posts array
  if (sourceId && postType === PostType.GROUP) {
    await Group.updateOne(
      { _id: sourceId },
      { $addToSet: { posts: post._id } }
    );
  }
  if (sourceId && postType === PostType.EVENT) {
    await Event.updateOne(
      { _id: sourceId },
      { $addToSet: { posts: post._id } }
    );
  }

  return post.populate('media itinerary userId sourceId');
}

async function getPostById(postId: string): Promise<IPost> {
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, 'Post not found');
  return post.populate('media itinerary userId sourceId');
}

async function updatePost(
  postId: string,
  payload: Partial<CreatePostPayload>
): Promise<IPost | null> {
  const { userId, content, privacy } = payload;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, 'Post not found');
  if (!userId || post.userId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to update this post');
  }
  await Post.updateOne({ _id: postId }, { $set: { content, privacy } });
  return Post.findById(postId).populate('media itinerary userId sourceId');
}

async function deletePost(postId: string): Promise<IPost> {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  //soft delete
  post.isDeleted = true;
  await post.save();
  //add this post under all media and itineraries deleted
  await Media.updateMany(
    { postId: new Types.ObjectId(postId) },
    { isDeleted: true }
  );
  await Itinerary.updateMany(
    { postId: new Types.ObjectId(postId) },
    { isDeleted: true }
  );
  return post.populate('media itinerary userId sourceId');
}
async function sharePost(payload: SharePostPayload): Promise<IPost> {
  const { userId, originalPostId, content, privacy } = payload;

  const originalPost = await Post.findById(originalPostId);
  if (!originalPost) {
    throw new ApiError(404, 'Original post not found');
  }

  const sharedPost = await Post.create({
    userId,
    content: content || '',
    postType: PostType.USER,
    privacy,
    isShared: true,
    originalPostId: new Types.ObjectId(originalPostId),
    shareCount: 0,
    itineraryViewCount: 0,
    sortedReactions: [],
    reactions: [],
    comments: [],
  });

  await Post.updateOne({ _id: originalPostId }, { $inc: { shareCount: 1 } });

  return sharedPost.populate('media itinerary userId originalPostId');
}

async function addOrRemoveReaction(
  payload: AddOrRemoveReactionPayload
): Promise<IPost> {
  const { userId, postId, reactionType } = payload;
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (!Object.values(ReactionType).includes(reactionType)) {
    throw new ApiError(400, 'Invalid reaction type');
  }

  // Check if user already reacted
  const existingReaction = post.reactions.find(
    r => r.userId.toString() === userId.toString()
  );

  if (existingReaction) {
    if (existingReaction.reactionType === reactionType) {
      // Same reaction, remove it
      await Post.updateOne(
        { _id: postId },
        { $pull: { reactions: { userId } } }
      );
    } else {
      // Different reaction, update it
      await Post.updateOne(
        { _id: postId, 'reactions.userId': userId },
        {
          $set: {
            'reactions.$.reactionType': reactionType,
            'reactions.$.updatedAt': new Date(),
          },
        }
      );
    }
  } else {
    // No existing reaction, add new one
    await Post.updateOne(
      { _id: postId },
      {
        $push: {
          reactions: {
            userId,
            postId,
            reactionType,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }
    );
  }

  // Update sortedReactions
  const reactions = await Post.findById(postId).select('reactions');
  const reactionCounts = Object.values(ReactionType).map(type => ({
    type,
    count: reactions!.reactions.filter(r => r.reactionType === type).length,
  }));
  await Post.updateOne(
    { _id: postId },
    { $set: { sortedReactions: reactionCounts } }
  );

  return Post.findById(postId).populate(
    'media itinerary userId sourceId'
  ) as Promise<IPost>;
}

async function createComment(payload: CreateCommentPayload): Promise<IPost> {
  const { userId, postId, comment, replyTo, parentCommentId } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  // Validate replyTo/parentCommentId
  if (replyTo || parentCommentId) {
    const commentExists = post.comments.some(
      c => c._id.toString() === (replyTo || parentCommentId)
    );
    if (!commentExists) {
      throw new ApiError(404, 'Parent comment not found');
    }
  }

  const newComment = {
    _id: new Types.ObjectId(),
    userId,
    postId,
    replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined,
    parentCommentId: parentCommentId
      ? new Types.ObjectId(parentCommentId)
      : undefined,
    comment,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await Post.updateOne({ _id: postId }, { $push: { comments: newComment } });

  return Post.findById(postId).populate(
    'media itinerary userId sourceId'
  ) as Promise<IPost>;
}

async function updateComment(payload: UpdateCommentPayload): Promise<IPost> {
  const { userId, postId, commentId, comment } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  // Verify comment exists and user owns it
  const existingComment = post.comments.find(
    c => c._id.toString() === commentId
  );
  if (!existingComment) {
    throw new ApiError(404, 'Comment not found');
  }
  if (existingComment.userId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to update this comment');
  }

  // Update comment
  await Post.updateOne(
    { _id: postId, 'comments._id': new Types.ObjectId(commentId) },
    {
      $set: {
        'comments.$.comment': comment,
        'comments.$.updatedAt': new Date(),
      },
    }
  );

  return Post.findById(postId).populate(
    'media itinerary userId sourceId'
  ) as Promise<IPost>;
}

async function deleteComment(payload: DeleteCommentPayload): Promise<IPost> {
  const { userId, postId, commentId } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  // Verify user owns the comment
  const comment = post.comments.find(c => c._id.toString() === commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }
  if (comment.userId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to delete this comment');
  }

  // Remove comment
  await Post.updateOne(
    { _id: postId },
    { $pull: { comments: { _id: new Types.ObjectId(commentId) } } }
  );

  return Post.findById(postId).populate(
    'media itinerary userId sourceId'
  ) as Promise<IPost>;
}
async function feedPosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
  const { userId } = filters;

  // Initialize variables
  let currentUserId: Types.ObjectId | null = null;
  let connectedUserIds: Types.ObjectId[] = [];
  let followedUserIds: Types.ObjectId[] = [];
  let eligibleUserIds: Types.ObjectId[] = [];
  let groupIds: Types.ObjectId[] = [];
  let eventIds: Types.ObjectId[] = [];
  let blockedUserIds: Types.ObjectId[] = [];

  if (userId) {
    // Validate userId
    if (!Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }
    currentUserId = new Types.ObjectId(userId);

    // Get connected users
    const connections = await Connections.find({
      status: ConnectionStatus.ACCEPTED,
      $or: [{ sentBy: currentUserId }, { receivedBy: currentUserId }],
    });
    connectedUserIds = connections.map(
      c =>
        new Types.ObjectId(
          c.sentBy.toString() === userId
            ? c.receivedBy.toString()
            : c.sentBy.toString()
        )
    );

    // Get followed users
    const followers = await Follower.find({ followerId: currentUserId });
    followedUserIds = followers.map(f => f.followedId);

    // Combine user IDs (include current user)
    eligibleUserIds = [
      ...new Set([
        ...connectedUserIds.map(id => id.toString()),
        ...followedUserIds.map(id => id.toString()),
        userId,
      ]),
    ].map(id => new Types.ObjectId(id));

    // Get groups and events the user is part of (assuming members field exists)
    const groups = await Group.find({ members: currentUserId });
    const events = await Event.find({ members: currentUserId });
    groupIds = groups.map(g => g._id);
    eventIds = events.map(e => e._id);

    // Get blocked users
    const blockedUsers = await BlockedUser.find({ blockerId: currentUserId });
    blockedUserIds = blockedUsers.map(b => b.blockedId);
  }

  // Build query
  const query: Record<string, any> = {
    $or: userId
      ? [
          // Timeline posts from eligible users
          {
            userId: { $in: eligibleUserIds },
            postType: PostType.USER,
          },
          // Group posts from groups the user is in
          {
            postType: PostType.GROUP,
            sourceId: { $in: groupIds },
          },
          // Event posts from events the user is in
          {
            postType: PostType.EVENT,
            sourceId: { $in: eventIds },
          },
        ]
      : [
          // Public posts for unauthenticated users
          {
            privacy: PostPrivacy.PUBLIC,
          },
        ],
    // Exclude posts from blocked users
    userId: { $nin: blockedUserIds },
  };

  // Privacy filtering for authenticated users
  if (userId) {
    query.$or.push({
      privacy: PostPrivacy.FRIENDS,
      userId: { $in: connectedUserIds },
    });
    query.$or.push({
      privacy: PostPrivacy.PRIVATE,
      userId: currentUserId,
    });
  }

  // Optional: Exclude seen posts (uncomment to use SeenPost model)
  /*
    if (currentUserId) {
      const seenPosts = await SeenPost.find({ userId: currentUserId }).distinct('postId');
      query._id = { $nin: seenPosts };
    }
    */

  options.populate = ['media', 'itinerary', 'userId', 'sourceId'];
  options.sortBy = options.sortBy || '-createdAt';

  // Fetch posts
  const posts = await Post.paginate(query, options);

  // Rank posts (simplified scoring)
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const now = Date.now();
  posts.results = posts.results.map(post => {
    let score = 0;

    // Recency score (0 to 1, higher for newer posts)
    const age = now - new Date(post.createdAt).getTime();
    const recencyScore = Math.max(0, 1 - age / maxAge);
    score += recencyScore * 50; // Weight: 50%

    // Engagement score
    const engagementScore =
      post.reactions.length * 0.5 +
      post.comments.length * 1 +
      post.shareCount * 2;
    score += engagementScore * 30; // Weight: 30%

    // Affinity score (only for authenticated users)
    if (userId) {
      if (connectedUserIds.some(id => id.equals(post.userId))) {
        score *= 1.2; // Boost 20% for connections
      } else if (followedUserIds.some(id => id.equals(post.userId))) {
        score *= 1.1; // Boost 10% for followed users
      }
    }

    // Content type score
    if (
      post.media.some((m: any) =>
        [MediaType.IMAGE, MediaType.VIDEO].includes(m.mediaType)
      )
    ) {
      score *= 1.15; // Boost 15% for image/video
    }

    return { ...post, score };
  });

  // Optional: Save seen posts (uncomment to use SeenPost model)
  /*
    if (currentUserId && posts.docs.length) {
      const seenPostDocs = posts.docs.map(post => ({
        userId: currentUserId,
        postId: post._id,
      }));
      await SeenPost.insertMany(seenPostDocs, { ordered: false });
    }
    */

  return posts;
}

async function getTimelinePosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
  const query: Record<string, any> = {
    postType: PostType.USER,
  };
  if (filters.userId) {
    query.$and = [{ userId: filters.userId }, { sourceId: filters.userId }];
  }
  options.populate = ['media', 'itinerary', 'userId', 'sourceId'];
  options.sortBy = options.sortBy || '-createdAt';
  return Post.paginate(query, options);
}

async function getGroupPosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
  const query: Record<string, any> = {
    postType: PostType.GROUP,
    sourceId: filters.groupId,
  };
  options.populate = ['media', 'itinerary', 'userId', 'sourceId'];
  options.sortBy = options.sortBy || '-createdAt';
  return Post.paginate(query, options);
}

async function getEventPosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
  const query: Record<string, any> = {
    postType: PostType.EVENT,
    sourceId: filters.eventId,
  };
  options.populate = ['media', 'itinerary', 'userId', 'sourceId'];
  options.sortBy = options.sortBy || '-createdAt';
  return Post.paginate(query, options);
}

function extractHashtags(content: string): string[] {
  const regex = /#(\w+)/g;
  const matches = content.match(regex) || [];
  return matches.map(tag => tag.slice(1).toLowerCase());
}

export const PostServices = {
  createPost,
  sharePost,
  getPostById,
  addOrRemoveReaction,
  createComment,
  updateComment,
  deletePost,
  updatePost,
  deleteComment,
  feedPosts,
  getTimelinePosts,
  getGroupPosts,
  getEventPosts,
};
