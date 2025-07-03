import { Types } from 'mongoose';
import { MediaType, SourceType } from '../media/media.interface';
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

  if (visitedLocation && visitedLocationName) {
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
      });
    }
  }

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
}

async function updatePost(
  postId: string,
  payload: Partial<CreatePostPayload>
): Promise<IPost | null> {
  const user = await User.findById(payload?.userId);
  if (!user) throw new ApiError(404, 'User not found');
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, 'Post not found');
  if (
    !payload?.userId ||
    post.userId.toString() !== payload?.userId.toString()
  ) {
    throw new ApiError(403, 'Not authorized to update this post');
  }
  await Post.findOneAndUpdate({ _id: postId }, payload, { new: true });
  return Post.findById(postId).populate(
    'media itinerary userId sourceId comments.mentions'
  );
}

async function deletePost(userId: string, postId: string): Promise<IPost> {
  const post = await Post.findOne({
    _id: postId,
    userId: new Types.ObjectId(userId),
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

  return sharedPost.populate(
    'media itinerary userId originalPostId comments.mentions'
  );
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

  const existingReaction = post.reactions.find(
    r => r.userId.toString() === userId.toString()
  );

  if (existingReaction) {
    if (existingReaction.reactionType === reactionType) {
      await Post.updateOne(
        { _id: postId },
        { $pull: { reactions: { userId } } }
      );
    } else {
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
    'media itinerary userId sourceId comments.mentions'
  ) as Promise<IPost>;
}

async function addOrRemoveCommentReaction(
  payload: AddOrRemoveCommentReactionPayload
): Promise<IPost> {
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
}

async function createComment(payload: CreateCommentPayload): Promise<IPost> {
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
}

async function updateComment(payload: UpdateCommentPayload): Promise<IPost> {
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
}

async function deleteComment(payload: DeleteCommentPayload): Promise<IPost> {
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
}

async function feedPosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
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
          }
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
}

async function getUserTimelinePosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
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

  options.sortBy = options.sortBy || '-createdAt';

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
}

async function getGroupPosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
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
  options.sortBy = options.sortBy || '-createdAt';
  return Post.paginate(query, options);
}

async function getEventPosts(
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> {
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
  options.sortBy = options.sortBy || '-createdAt';
  return Post.paginate(query, options);
}

function extractHashtags(content: string): string[] {
  const regex = /#(\w+)/g;
  const matches = content.match(regex) || [];
  return matches;
}

function extractMentions(content: string): string[] {
  const regex = /@(\w+)/g;
  const matches = content.match(regex) || [];
  return matches.map(mention => mention.replace(/^@/, ''));
}

export const PostServices = {
  createPost,
  sharePost,
  getPostById,
  addOrRemoveReaction,
  addOrRemoveCommentReaction,
  createComment,
  updateComment,
  deletePost,
  updatePost,
  deleteComment,
  feedPosts,
  getUserTimelinePosts,
  getGroupPosts,
  getEventPosts,
};
