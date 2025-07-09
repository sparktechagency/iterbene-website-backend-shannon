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
import { StatusCodes } from 'http-status-codes';
import calculateDistance from '../../utils/calculateDistance';

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

interface AddOrRemoveCommentReactionPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
  reactionType: ReactionType;
}

interface CreateCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  comment: string;
  replyTo?: string;
  parentCommentId?: string;
  mentions?: string[]; // Array of usernames to mention
}

interface UpdateCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
  comment: string;
  mentions?: string[]; // Array of usernames to mention
}

interface DeleteCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
}

// Create a new post
const createPost = async (payload: CreatePostPayload): Promise<IPost> => {
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

  let itinerary: Types.ObjectId | undefined;
  if (itineraryId) {
    const itineraryDoc = await Itinerary.findById(itineraryId);
    if (!itineraryDoc) throw new ApiError(404, 'Itinerary not found');
    itinerary = itineraryDoc._id;
  }

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
          sourceId: new Types.ObjectId(),
          sourceType: postType,
          mediaType: fileMediaType,
          mediaUrl: mediaUrl[0],
          isDeleted: false,
        };
      })
    );
  }

  const mediaDocs = await Media.insertMany(mediaData);

  const hashtags = extractHashtags(content || '');
  const uniqueHashtags = [
    ...new Set(hashtags.map(tag => tag.replace(/^#/, ''))),
  ];
  if (uniqueHashtags.length) {
    await Promise.all(
      uniqueHashtags.map(async tag => {
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

  const post = await Post.create({
    userId,
    sourceId: sourceId ? new Types.ObjectId(sourceId) : undefined,
    postType,
    content: content || '',
    media: mediaDocs?.map(m => m._id),
    itinerary,
    hashtags: uniqueHashtags,
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

  if (itinerary) {
    await Itinerary.updateOne({ _id: itinerary }, { postId: post._id });
  }

  if (uniqueHashtags.length) {
    await Hashtag.updateMany(
      { _id: { $in: uniqueHashtags } },
      { $addToSet: { posts: post._id } }
    );
  }

  await Promise.all(
    mediaDocs.map(media =>
      Media.updateOne({ _id: media._id }, { sourceId: post._id })
    )
  );

  // add visited location for user maps
  if (visitedLocation && visitedLocationName) {
    const mapsUser = await Maps.findOne({ userId });
    // cannot entry duplicate visitedLocation
    const existingSameLocation = mapsUser?.visitedLocation.find(
      item =>
        item.latitude === visitedLocation?.latitude &&
        item.longitude === visitedLocation?.longitude &&
        item.visitedLocationName === visitedLocationName
    );
    if (existingSameLocation) {
      return post.populate('media itinerary userId sourceId');
    }
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
      });
    }
  }

  return post.populate('media itinerary userId sourceId');
};

// Update post
const updatePost = async (
  postId: string,
  payload: Partial<CreatePostPayload>
): Promise<IPost | null> => {
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

  // Validate user exists
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Find the post
  const post = await Post.findOne({
    _id: postId,
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  });
  if (!post) throw new ApiError(404, 'Post not found');

  // Validate sourceId if postType is being updated
  if (postType && sourceId) {
    if (postType === PostType.GROUP) {
      const group = await Group.findById(sourceId);
      if (!group || group.isDeleted) throw new ApiError(404, 'Group not found');
    }
    if (postType === PostType.EVENT) {
      const event = await Event.findById(sourceId);
      if (!event || event.isDeleted) throw new ApiError(404, 'Event not found');
    }
  }

  // Handle itinerary update
  let itinerary: Types.ObjectId | undefined;
  if (itineraryId !== undefined) {
    if (itineraryId) {
      const itineraryDoc = await Itinerary.findById(itineraryId);
      if (!itineraryDoc) throw new ApiError(404, 'Itinerary not found');
      itinerary = itineraryDoc._id;
    } else {
      itinerary = undefined;
    }
  }

  // Handle media update if files are provided
  let newMediaIds: Types.ObjectId[] = [];
  if (files && files.length > 0) {
    // Upload new media files
    const mediaData = await Promise.all(
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
          sourceId: new Types.ObjectId(postId),
          sourceType: postType || post.postType,
          mediaType: fileMediaType,
          mediaUrl: mediaUrl[0],
          isDeleted: false,
        };
      })
    );

    const mediaDocs = await Media.insertMany(mediaData);
    newMediaIds = mediaDocs.map(m => m._id);
  }

  // Handle hashtags update if content is provided
  let uniqueHashtags: string[] = [];
  if (content !== undefined) {
    // Remove old hashtags from hashtag collection
    if (post.hashtags && post.hashtags.length > 0) {
      await Hashtag.updateMany(
        { _id: { $in: post.hashtags } },
        {
          $inc: { postCount: -1 },
          $pull: { posts: post._id },
        }
      );
    }

    // Extract and process new hashtags
    const hashtags = extractHashtags(content || '');
    uniqueHashtags = [...new Set(hashtags.map(tag => tag.replace(/^#/, '')))];

    if (uniqueHashtags.length > 0) {
      await Promise.all(
        uniqueHashtags.map(async tag => {
          await Hashtag.findOneAndUpdate(
            { _id: tag },
            {
              $setOnInsert: { name: tag, createdAt: new Date() },
              $inc: { postCount: 1 },
              $addToSet: { posts: post._id },
            },
            { upsert: true }
          );
        })
      );
    }
  }
  // Handle itinerary relationship update
  if (itineraryId !== undefined) {
    // Remove old itinerary relationship
    if (post.itinerary) {
      await Itinerary.updateOne(
        { _id: post.itinerary },
        { $unset: { postId: '' } }
      );
    }

    // Add new itinerary relationship
    if (itinerary) {
      await Itinerary.updateOne({ _id: itinerary }, { postId: post._id });
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (content !== undefined) updateData.content = content;
  if (newMediaIds?.length > 0)
    updateData.media = [...post.media, ...newMediaIds];
  if (itineraryId !== undefined) updateData.itinerary = itinerary;
  if (postType !== undefined) updateData.postType = postType;
  if (privacy !== undefined) updateData.privacy = privacy;
  if (sourceId !== undefined)
    updateData.sourceId = sourceId ? new Types.ObjectId(sourceId) : undefined;
  if (visitedLocation !== undefined)
    updateData.visitedLocation = visitedLocation;
  if (visitedLocationName !== undefined)
    updateData.visitedLocationName = visitedLocationName;
  if (uniqueHashtags.length > 0 || content !== undefined)
    updateData.hashtags = uniqueHashtags;

  // Update the post
  const response = await Post.findOneAndUpdate({ _id: postId }, updateData, {
    new: true,
  });
  // Handle visited location update
  if (visitedLocation !== undefined && visitedLocationName !== undefined) {
    // add visited location for user maps
    if (visitedLocation && visitedLocationName) {
      const mapsUser = await Maps.findOne({ userId });
      // cannot entry duplicate visitedLocation
      const existingSameLocation = mapsUser?.visitedLocation.find(
        item =>
          item.latitude === visitedLocation?.latitude &&
          item.longitude === visitedLocation?.longitude &&
          item.visitedLocationName === visitedLocationName
      );
      if (existingSameLocation) {
        return response;
      }
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
        });
      }
    }
  }
  return response;
};

// Get post by id
const getPostById = async (postId: string): Promise<IPost> => {
  const post = await Post.findById(postId).populate([
    {
      path: 'media',
      select: 'mediaType mediaUrl',
    },
    { path: 'itinerary' },
    {
      path: 'userId',
      select: 'fullName username profileImage',
    },
    {
      path: 'reactions',
      populate: {
        path: 'userId',
        select: 'fullName username profileImage',
      },
    },
    {
      path: 'comments',
      populate: [
        {
          path: 'userId',
          select: 'fullName username profileImage',
        },
        {
          path: 'mentions',
          select: 'fullName username profileImage',
        },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ]);
  if (!post || post.isDeleted) throw new ApiError(404, 'Post not found');
  return post;
};

// Delete post
const deletePost = async (userId: string, postId: string): Promise<IPost> => {
  const post = await Post.findOne({
    _id: postId,
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  });

  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  post.isDeleted = true;
  await post.save();
  await Media.updateMany(
    { postId: new Types.ObjectId(postId) },
    { isDeleted: true }
  );
  await Itinerary.updateMany(
    { postId: new Types.ObjectId(postId) },
    { isDeleted: true }
  );
  return post.populate('media itinerary userId sourceId comments.mentions');
};

// Share post
const sharePost = async (payload: SharePostPayload): Promise<IPost> => {
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

  return sharedPost.populate(
    'media itinerary userId originalPostId comments.mentions'
  );
};

/**
 * Add or remove a reaction to/from a post
 * @param {AddOrRemoveReactionPayload} payload
 * @returns {Promise<IPost>}
 */
const addOrRemoveReaction = async (
  payload: AddOrRemoveReactionPayload
): Promise<IPost> => {
  const { userId, postId, reactionType } = payload;
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  // Check if the reaction type is valid
  if (!Object.values(ReactionType).includes(reactionType)) {
    throw new ApiError(400, 'Invalid reaction type');
  }

  // Find the existing reaction
  const existingReaction = post.reactions.find(
    r => r.userId.toString() === userId.toString()
  );

  // If the reaction exists, check if it's the same type
  if (existingReaction) {
    if (existingReaction.reactionType === reactionType) {
      // Remove the reaction if it's the same type
      await Post.updateOne(
        { _id: postId },
        { $pull: { reactions: { userId } } }
      );
    } else {
      // Update the reaction type if it's different
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
    // Add a new reaction
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

  // Recalculate the sorted reactions
  const reactions = await Post.findById(postId).select('reactions');
  const reactionCounts = Object.values(ReactionType).map(type => ({
    type,
    count: reactions!.reactions.filter(r => r.reactionType === type).length,
  }));
  await Post.updateOne(
    { _id: postId },
    { $set: { sortedReactions: reactionCounts } }
  );

  // Return the updated post
  return Post.findById(postId).populate(
    'media itinerary userId sourceId comments.mentions'
  ) as Promise<IPost>;
};

const addOrRemoveCommentReaction = async (
  payload: AddOrRemoveCommentReactionPayload
): Promise<IPost> => {
  const { userId, postId, commentId, reactionType } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  const comment = post.comments.find(c => c._id.toString() === commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  if (!Object.values(ReactionType).includes(reactionType)) {
    throw new ApiError(400, 'Invalid reaction type');
  }

  const existingReaction = comment.reactions.find(
    r => r.userId.toString() === userId.toString()
  );

  if (existingReaction) {
    if (existingReaction.reactionType === reactionType) {
      await Post.updateOne(
        { _id: postId, 'comments._id': new Types.ObjectId(commentId) },
        { $pull: { 'comments.$.reactions': { userId } } }
      );
    } else {
      await Post.updateOne(
        {
          _id: postId,
          'comments._id': new Types.ObjectId(commentId),
          'comments.reactions.userId': userId,
        },
        {
          $set: {
            'comments.$.reactions.$[reaction].reactionType': reactionType,
            'comments.$.reactions.$[reaction].updatedAt': new Date(),
          },
        },
        { arrayFilters: [{ 'reaction.userId': userId }] }
      );
    }
  } else {
    await Post.updateOne(
      { _id: postId, 'comments._id': new Types.ObjectId(commentId) },
      {
        $push: {
          'comments.$.reactions': {
            userId,
            commentId: new Types.ObjectId(commentId),
            reactionType,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }
    );
  }

  return Post.findById(postId).populate(
    'media itinerary userId sourceId comments.mentions'
  ) as Promise<IPost>;
};

const createComment = async (payload: CreateCommentPayload): Promise<IPost> => {
  const { userId, postId, comment, replyTo, parentCommentId, mentions } =
    payload;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (parentCommentId) {
    const commentExists = post.comments.some(
      c => c._id.toString() == parentCommentId
    );
    if (!commentExists) {
      throw new ApiError(404, 'Parent comment not found');
    }
  }

  // Process mentions
  let mentionUserIds: Types.ObjectId[] = [];
  if (mentions && mentions.length) {
    const users = await User.find({ username: { $in: mentions } });
    mentionUserIds = users.map(user => user._id);
    // Validate that all mentioned usernames exist
    if (mentionUserIds.length !== mentions.length) {
      const foundUsernames = users.map(user => user.username);
      const invalidMentions = mentions.filter(
        username => !foundUsernames.includes(username)
      );
      throw new ApiError(
        400,
        `Invalid usernames: ${invalidMentions.join(', ')}`
      );
    }
  }

  const newComment = {
    userId,
    postId,
    replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined,
    parentCommentId: parentCommentId
      ? new Types.ObjectId(parentCommentId)
      : undefined,
    comment,
    mentions: mentionUserIds,
  };

  await Post.updateOne({ _id: postId }, { $push: { comments: newComment } });

  return Post.findById(postId).populate(
    'media itinerary userId sourceId comments.mentions'
  ) as Promise<IPost>;
};

const updateComment = async (payload: UpdateCommentPayload): Promise<IPost> => {
  const { userId, postId, commentId, comment, mentions } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  const existingComment = post.comments.find(
    c => c._id.toString() === commentId
  );
  if (!existingComment) {
    throw new ApiError(404, 'Comment not found');
  }
  if (existingComment.userId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to update this comment');
  }

  // Process mentions
  let mentionUserIds: Types.ObjectId[] = [];
  if (mentions && mentions.length) {
    const users = await User.find({ username: { $in: mentions } });
    mentionUserIds = users.map(user => user._id);
    if (mentionUserIds.length !== mentions.length) {
      const foundUsernames = users.map(user => user.username);
      const invalidMentions = mentions.filter(
        username => !foundUsernames.includes(username)
      );
      throw new ApiError(
        400,
        `Invalid usernames: ${invalidMentions.join(', ')}`
      );
    }
  }

  await Post.updateOne(
    { _id: postId, 'comments._id': new Types.ObjectId(commentId) },
    {
      $set: {
        'comments.$.comment': comment,
        'comments.$.mentions': mentionUserIds,
        'comments.$.updatedAt': new Date(),
      },
    }
  );

  return Post.findById(postId).populate(
    'media itinerary userId sourceId comments.mentions'
  ) as Promise<IPost>;
};

const deleteComment = async (payload: DeleteCommentPayload): Promise<IPost> => {
  const { userId, postId, commentId } = payload;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  const comment = post.comments.find(c => c._id.toString() === commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }
  if (comment.userId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to delete this comment');
  }

  await Post.updateOne(
    { _id: postId },
    { $pull: { comments: { _id: new Types.ObjectId(commentId) } } }
  );

  return Post.findById(postId).populate(
    'media itinerary userId sourceId comments.mentions'
  ) as Promise<IPost>;
};

const feedPosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> => {
  const { userId } = filters;

  let currentUserId: Types.ObjectId | null = null;
  let connectedUserIds: Types.ObjectId[] = [];
  let followedUserIds: Types.ObjectId[] = [];
  let eligibleUserIds: Types.ObjectId[] = [];
  let blockedUserIds: Types.ObjectId[] = [];

  if (userId) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }
    currentUserId = new Types.ObjectId(userId);

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

    const followers = await Follower.find({ followerId: currentUserId });
    followedUserIds = followers.map(f => f.followedId);

    eligibleUserIds = [
      ...new Set([
        ...connectedUserIds.map(id => id.toString()),
        ...followedUserIds.map(id => id.toString()),
        userId,
      ]),
    ].map(id => new Types.ObjectId(id));

    const blockedUsers = await BlockedUser.find({ blockerId: currentUserId });
    blockedUserIds = blockedUsers.map(b => b.blockedId);
  }

  const query: Record<string, any> = {
    isDeleted: false,
    $or: userId
      ? [
          {
            userId: { $in: eligibleUserIds },
            postType: PostType.USER,
          },
        ]
      : [
          {
            postType: PostType.USER,
            privacy: PostPrivacy.PUBLIC,
          },
        ],
    userId: { $nin: blockedUserIds },
  };

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

  options.populate = [
    {
      path: 'media',
      select: 'mediaType mediaUrl',
    },
    { path: 'itinerary' },
    {
      path: 'userId',
      select: 'fullName username profileImage',
    },
    {
      path: 'reactions',
      populate: {
        path: 'userId',
        select: 'fullName username profileImage',
      },
    },
    {
      path: 'comments',
      populate: [
        {
          path: 'userId',
          select: 'fullName username profileImage',
        },
        {
          path: 'mentions',
          select: 'fullName username profileImage',
        },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';

  const posts = await Post.paginate(query, options);

  if (
    filters.mediaType === MediaType.IMAGE ||
    filters.mediaType === MediaType.VIDEO
  ) {
    posts.results = posts.results.filter(
      post =>
        post.media.length > 0 &&
        //@ts-ignore
        post.media.every(media => media.mediaType === filters.mediaType)
    );
    posts.totalResults = posts.results.length;
    posts.totalPages = Math.ceil(posts.totalResults / (options.limit || 10));
  }

  posts.results = posts.results.map(post => {
    if (post.reactions) {
      post.reactions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    if (post.comments) {
      post.comments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return post;
  });

  return posts;
};

//
const getUserTimelinePosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> => {
  const query: Record<string, any> = {
    postType: PostType.USER,
    privacy: PostPrivacy.PUBLIC,
    isDeleted: false,
  };
  const requestedUser = await User.findOne({ username: filters.username });

  if (requestedUser) {
    query.$and = [
      { userId: requestedUser._id },
      { sourceId: requestedUser._id },
    ];
  }

  options.populate = [
    {
      path: 'media',
      select: 'mediaType mediaUrl',
      match: { isDeleted: false },
    },
    { path: 'itinerary' },
    {
      path: 'userId',
      select: 'fullName username profileImage',
    },
    {
      path: 'reactions',
      populate: {
        path: 'userId',
        select: 'fullName username profileImage',
      },
    },
    {
      path: 'comments',
      populate: [
        {
          path: 'userId',
          select: 'fullName username profileImage',
        },
        {
          path: 'mentions',
          select: 'fullName username profileImage',
        },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ];

  options.sortBy = options.sortBy || 'createdAt';

  let posts = await Post.paginate(query, options);

  if (
    filters.mediaType === MediaType.IMAGE ||
    filters.mediaType === MediaType.VIDEO
  ) {
    posts.results = posts.results.filter(
      post =>
        post.media.length > 0 &&
        //@ts-ignore
        post.media.every(media => media.mediaType === filters.mediaType)
    );
    posts.totalResults = posts.results.length;
    posts.totalPages = Math.ceil(posts.totalResults / (options.limit || 10));
  }
  if (filters?.mediaType === 'itinerary') {
    posts.results = posts.results.filter(post => post?.itinerary);
    posts.totalResults = posts.results.length;
    posts.totalPages = Math.ceil(posts.totalResults / (options.limit || 10));
  }

  return posts;
};

// get group posts
const getGroupPosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> => {
  const query: Record<string, any> = {
    isDeleted: false,
    postType: PostType.GROUP,
    sourceId: filters.groupId,
  };
  options.populate = [
    {
      path: 'media',
      select: 'mediaType mediaUrl',
    },
    { path: 'itinerary' },
    {
      path: 'userId',
      select: 'fullName username profileImage',
    },
    {
      path: 'reactions',
      populate: {
        path: 'userId',
        select: 'fullName username profileImage',
      },
    },
    {
      path: 'comments',
      populate: [
        {
          path: 'userId',
          select: 'fullName username profileImage',
        },
        {
          path: 'mentions',
          select: 'fullName username profileImage',
        },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ];
  options.sortBy = options.sortBy || 'createdAt';
  return Post.paginate(query, options);
};

// Get event posts
const getEventPosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> => {
  const query: Record<string, any> = {
    isDeleted: false,
    postType: PostType.EVENT,
    sourceId: filters.eventId,
  };
  options.populate = [
    {
      path: 'media',
      select: 'mediaType mediaUrl',
    },
    { path: 'itinerary' },
    {
      path: 'userId',
      select: 'fullName username profileImage',
    },
    {
      path: 'reactions',
      populate: {
        path: 'userId',
        select: 'fullName username profileImage',
      },
    },
    {
      path: 'comments',
      populate: [
        {
          path: 'userId',
          select: 'fullName username profileImage',
        },
        {
          path: 'mentions',
          select: 'fullName username profileImage',
        },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ];
  options.sortBy = options.sortBy || 'createdAt';
  return Post.paginate(query, options);
};

function extractHashtags(content: string): string[] {
  const regex = /#(\w+)/g;
  const matches = content.match(regex) || [];
  return matches;
}

const getVisitedPostsWithDistance = async (
  userId: string,
  options: PaginateOptions
): Promise<PaginateResult<IPost[]>> => {
  // Get user's current location
  const user = await User.findById(userId).select('location');
  if (!user || !user?.location) {
    throw new Error('User location not found');
  }
  const userLat = user?.location?.latitude;
  const userLon = user?.location?.longitude;

  // Build query for posts with visited location
  const query: Record<string, any> = {
    postType: PostType.USER,
    userId: userId,
    visitedLocationName: { $exists: true, $ne: null },
    visitedLocation: { $exists: true, $ne: null },
    isDeleted: false,
  };

  // Set up population options
  options.select = 'media visitedLocation visitedLocationName';
  options.populate = [
    {
      path: 'media',
      select: 'mediaType mediaUrl',
    },
    {
      path: 'itinerary',
      select: 'days overAllRating',
    },
  ];

  // Get paginated posts
  const result = await Post.paginate(query, options);

  // Calculate distance for each post and add it to the post object
  const postsWithDistance = result?.results?.map((post: any) => {
    const postObj = post.toObject();
    if (
      postObj.visitedLocation?.latitude &&
      postObj.visitedLocation?.longitude
    ) {
      const distance = calculateDistance(
        userLat as number,
        userLon as number,
        postObj.visitedLocation.latitude,
        postObj.visitedLocation.longitude
      );
      postObj.distance = distance;
    } else {
      postObj.distance = null;
    }

    return postObj;
  });

  return {
    ...result,
    results: postsWithDistance,
  };
};

export const PostServices = {
  createPost,
  sharePost,
  addOrRemoveReaction,
  addOrRemoveCommentReaction,
  createComment,
  updateComment,
  deleteComment,
  feedPosts,
  getPostById,
  getUserTimelinePosts,
  getGroupPosts,
  getEventPosts,
  updatePost,
  deletePost,
  getVisitedPostsWithDistance,
};
