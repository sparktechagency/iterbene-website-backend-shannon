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
import { User } from '../user/user.model';
import { Maps } from '../maps/maps.model';
import { uploadFilesToS3 } from '../../helpers/s3Service';
import { StatusCodes } from 'http-status-codes';
import calculateDistance from '../../utils/calculateDistance';
import { NotificationService } from '../notification/notification.services';
import { INotification } from '../notification/notification.interface';
import {
  AddOrRemoveCommentReactionPayload,
  AddOrRemoveReactionPayload,
  CreateCommentPayload,
  CreatePostPayload,
  DeleteCommentPayload,
  SharePostPayload,
  UpdateCommentPayload,
} from '../../types/post';

const UPLOADS_FOLDER = 'uploads/posts';

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
    visitedLocation: {
      latitude: visitedLocation?.latitude,
      longitude: visitedLocation?.longitude,
    },
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
    if (mapsUser) {
      // cannot entry duplicate visitedLocation
      const existingSameLocation = mapsUser?.visitedLocation.find(
        item =>
          item.latitude == visitedLocation?.latitude &&
          item.longitude == visitedLocation?.longitude &&
          item.visitedLocationName == visitedLocationName
      );
      if (!existingSameLocation) {
        mapsUser.visitedLocation.push({
          latitude: visitedLocation?.latitude || 0,
          longitude: visitedLocation?.longitude || 0,
          visitedLocationName: visitedLocationName as string,
        });
        await mapsUser.save();
      }
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
  }).populate([
    { path: 'media', select: 'mediaType mediaUrl' },
    { path: 'itinerary' },
    { path: 'userId', select: 'fullName username profileImage' },
    { path: 'sourceId' },
    {
      path: 'comments',
      populate: [
        { path: 'mentions', select: 'fullName username profileImage' },
        { path: 'userId', select: 'fullName username profileImage' },
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

  updateData.content = content;
  if (newMediaIds?.length > 0)
    updateData.media = [...post.media, ...newMediaIds];
  updateData.itinerary = itinerary;
  if (postType !== undefined) updateData.postType = postType;
  if (privacy !== undefined) updateData.privacy = privacy;
  if (sourceId !== undefined)
    updateData.sourceId = sourceId ? new Types.ObjectId(sourceId) : undefined;
  updateData.visitedLocation = visitedLocation;
  updateData.visitedLocationName = visitedLocationName;
  if (uniqueHashtags.length > 0 || content !== undefined)
    updateData.hashtags = uniqueHashtags;

  // Handle visited location update
  if (visitedLocation && visitedLocationName) {
    const mapsUser = await Maps.findOne({ userId });
    if (mapsUser) {
      // cannot entry duplicate visitedLocation
      const existingSameLocation = mapsUser?.visitedLocation.find(
        item =>
          item.latitude == visitedLocation?.latitude &&
          item.longitude == visitedLocation?.longitude &&
          item.visitedLocationName == visitedLocationName
      );
      if (!existingSameLocation) {
        mapsUser.visitedLocation.push({
          latitude: visitedLocation?.latitude || 0,
          longitude: visitedLocation?.longitude || 0,
          visitedLocationName: visitedLocationName as string,
        });
        await mapsUser.save();
      }
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
  Object.assign(post, updateData);
  const response = await post.save();
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
        {
          path: 'replies',
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
      ],
    },
  ]);
  if (!post || post.isDeleted) throw new ApiError(404, 'Post not found');
  return post;
};

// Delete post
const deletePost = async (userId: string, postId: string): Promise<IPost> => {
  try {
    // Find the post with userId and isDeleted checks
    const post = await Post.findOne({
      _id: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
    }

    // Remove visited location from Maps if it exists
    if (
      post?.visitedLocation?.latitude &&
      post?.visitedLocation?.longitude &&
      post?.visitedLocationName
    ) {
      const mapsUser = await Maps.findOne({ userId });
      if (mapsUser) {
        mapsUser.visitedLocation = mapsUser.visitedLocation.filter(
          item =>
            !(
              item?.latitude === post?.visitedLocation?.latitude &&
              item?.longitude === post?.visitedLocation?.longitude &&
              item?.visitedLocationName === post?.visitedLocationName
            )
        );
        await mapsUser.save();
      }
    }

    // Soft-delete the post
    post.isDeleted = true;
    await post.save();

    // Soft-delete associated Media and Itinerary documents
    await Media.updateMany(
      { postId: new Types.ObjectId(postId), isDeleted: false },
      { isDeleted: true }
    );

    await Itinerary.updateMany(
      { postId: new Types.ObjectId(postId), isDeleted: false },
      { isDeleted: true }
    );

    // Populate the post
    const populatedPost = await Post.findById(postId)
      .populate([
        { path: 'media' },
        { path: 'itinerary' },
        { path: 'userId' },
        { path: 'sourceId' },
        {
          path: 'comments',
          populate: [
            { path: 'mentions' },
            { path: 'userId' },
            { path: 'reactions', populate: { path: 'userId' } },
            {
              path: 'replies',
              populate: [
                { path: 'userId' },
                { path: 'mentions' },
                { path: 'reactions', populate: { path: 'userId' } },
              ],
            },
          ],
        },
      ])
      .lean();

    if (!populatedPost) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Failed to retrieve populated post'
      );
    }

    return populatedPost;
  } catch (error) {
    throw error;
  }
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

  return sharedPost.populate([
    { path: 'media' },
    { path: 'itinerary' },
    { path: 'userId' },
    { path: 'originalPostId' },
    {
      path: 'comments',
      populate: [
        { path: 'mentions' },
        { path: 'userId' },
        { path: 'reactions', populate: { path: 'userId' } },
        {
          path: 'replies',
          populate: [
            { path: 'userId' },
            { path: 'mentions' },
            { path: 'reactions', populate: { path: 'userId' } },
          ],
        },
      ],
    },
  ]);
};

// Add or remove reaction
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
    // Send notification
    const user = await User.findById(payload.userId);
    if (user?.id?.toString() !== post.userId?.toString()) {
      const addOrRemoveReactionNotification: INotification = {
        senderId: payload.userId,
        receiverId: post.userId,
        title: `${user?.fullName} reacted to your post`,
        message: `${
          user?.fullName
        } ${payload.reactionType.toLowerCase()}d your post: "${post.content?.substring(
          0,
          50
        )}..."`,
        type: 'post',
        linkId: postId,
        role: 'user',
        viewStatus: false,
        image: user?.profileImage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await NotificationService.addCustomNotification(
        'notification',
        addOrRemoveReactionNotification,
        post.userId.toString()
      );
    }
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
  return Post.findById(postId).populate([
    { path: 'media', select: 'mediaType mediaUrl' },
    { path: 'itinerary' },
    { path: 'userId', select: 'fullName username profileImage' },
    { path: 'sourceId' },
    {
      path: 'comments',
      populate: [
        { path: 'mentions', select: 'fullName username profileImage' },
        { path: 'userId', select: 'fullName username profileImage' },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ]) as Promise<IPost>;
};

// Add or remove reaction on comment
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

  // send notification
  const user = await User.findById(userId);
  if (user?.id?.toString() !== post.userId?.toString()) {
    const addOrRemoveReactionNotification: INotification = {
      senderId: userId,
      receiverId: post.userId,
      title: `${user?.fullName} reacted to your comment`,
      message: `${
        user?.fullName
      } ${reactionType.toLowerCase()}d your comment: "${comment.comment?.substring(
        0,
        50
      )}..."`,
      type: 'comment',
      linkId: commentId,
      role: 'user',
      viewStatus: false,
      image: user?.profileImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await NotificationService.addCustomNotification(
      'notification',
      addOrRemoveReactionNotification,
      post.userId.toString()
    );
  }

  return Post.findById(postId).populate([
    { path: 'media', select: 'mediaType mediaUrl' },
    { path: 'itinerary' },
    { path: 'userId', select: 'fullName username profileImage' },
    { path: 'sourceId' },
    {
      path: 'comments',
      populate: [
        { path: 'mentions', select: 'fullName username profileImage' },
        { path: 'userId', select: 'fullName username profileImage' },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ]) as Promise<IPost>;
};

//create comment
const createComment = async (payload: CreateCommentPayload): Promise<IPost> => {
  const { userId, postId, comment, replyTo, parentCommentId, mentions } =
    payload;
  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  // Process mentions
  let mentionUserIds: Types.ObjectId[] = [];
  if (mentions && mentions?.length) {
    const users = await User.find({
      username: { $in: mentions },
      isDeleted: false,
    });
    mentionUserIds = users.map(user => user._id);
    // Validate that all mentioned usernames exist
    if (mentionUserIds.length !== mentions.length) {
      const foundUsernames = users.map(user => user?.username);
      const invalidMentions = mentions?.filter(
        username => !foundUsernames.includes(username)
      );
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
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

  // If this is a reply, add it to the parent comment's replies array
  if (parentCommentId) {
    const parentComment = post?.comments?.find(
      c => c?._id?.toString() === parentCommentId
    );
    if (!parentComment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent comment not found');
    }
    await Post.updateOne(
      { _id: postId, 'comments?._id': new Types.ObjectId(parentCommentId) },
      {
        $push: {
          'comments.$.replies': new Types.ObjectId(),
        },
      }
    );
  }

  // Add the new comment to the post
  const updatedPost = await Post.findOneAndUpdate(
    { _id: postId },
    { $push: { comments: newComment } },
    { new: true }
  );

  // Update the parent comment's replies array with the new comment's ID
  if (parentCommentId && updatedPost) {
    const newCommentId =
      updatedPost.comments[updatedPost.comments.length - 1]._id;
    await Post.updateOne(
      { _id: postId, 'comments._id': new Types.ObjectId(parentCommentId) },
      {
        $addToSet: {
          'comments.$.replies': newCommentId,
        },
      }
    );
  }

  // Send notification
  const user = await User.findById(payload?.userId);
  if (user?.id?.toString() !== post.userId?.toString()) {
    const notification: INotification = {
      senderId: payload.userId,
      receiverId: post.userId,
      title: `${user?.fullName} commented on your post`,
      message: `${user?.fullName} commented: "${payload.comment.substring(
        0,
        50
      )}..."`,
      type: 'comment',
      linkId: postId,
      role: 'user',
      viewStatus: false,
      image: user?.profileImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await NotificationService.addCustomNotification(
      'notification',
      notification,
      post.userId.toString()
    );
  }

  // If this is a reply, also notify the user being replied to
  if (replyTo) {
    const replyToUser = await User.findById(replyTo);
    if (replyToUser && replyToUser?.id !== user?.id) {
      const replyNotification: INotification = {
        senderId: payload.userId,
        receiverId: new Types.ObjectId(replyTo),
        title: `${user?.fullName} replied to your comment`,
        message: `${user?.fullName} replied: "${payload.comment.substring(
          0,
          50
        )}..."`,
        type: 'comment',
        linkId: postId,
        role: 'user',
        viewStatus: false,
        image: user?.profileImage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await NotificationService.addCustomNotification(
        'notification',
        replyNotification,
        replyTo
      );
    }
  }

  return Post.findById(postId).populate([
    { path: 'media', select: 'mediaType mediaUrl' },
    { path: 'itinerary' },
    { path: 'userId', select: 'fullName username profileImage' },
    { path: 'sourceId' },
    {
      path: 'comments',
      populate: [
        { path: 'mentions', select: 'fullName username profileImage' },
        { path: 'userId', select: 'fullName username profileImage' },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ]) as Promise<IPost>;
};

// Update comment
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

  return Post.findById(postId).populate([
    { path: 'media', select: 'mediaType mediaUrl' },
    { path: 'itinerary' },
    { path: 'userId', select: 'fullName username profileImage' },
    { path: 'sourceId' },
    {
      path: 'comments',
      populate: [
        { path: 'mentions', select: 'fullName username profileImage' },
        { path: 'userId', select: 'fullName username profileImage' },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
      ],
    },
  ]) as Promise<IPost>;
};

// Delete comment
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

  // Remove the comment from any parent comment's replies array
  await Post.updateOne(
    { _id: postId, 'comments.replies': new Types.ObjectId(commentId) },
    { $pull: { 'comments.$.replies': new Types.ObjectId(commentId) } }
  );

  return Post.findById(postId).populate([
    { path: 'media' },
    { path: 'itinerary' },
    { path: 'userId' },
    { path: 'sourceId' },
    {
      path: 'comments',
      populate: [
        { path: 'mentions' },
        { path: 'userId' },
        { path: 'reactions', populate: { path: 'userId' } },
        {
          path: 'replies',
          populate: [
            { path: 'userId' },
            { path: 'mentions' },
            { path: 'reactions', populate: { path: 'userId' } },
            {
              path: 'replies',
              populate: [
                { path: 'userId' },
                { path: 'mentions' },
                { path: 'reactions', populate: { path: 'userId' } },
              ],
            },
          ],
        },
      ],
    },
  ]) as Promise<IPost>;
};

// Feed posts with filters and pagination
const feedPosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> => {
  const { userId, mediaType } = filters;

  let currentUserId: Types.ObjectId | null = null;
  let connectedUserIds: Types.ObjectId[] = [];
  let blockedUserIds: Types.ObjectId[] = [];

  if (userId) {
    currentUserId = new Types.ObjectId(userId);
    const [connections, blockedUsers] = await Promise.all([
      Connections.find({
        status: ConnectionStatus.ACCEPTED,
        $or: [{ sentBy: currentUserId }, { receivedBy: currentUserId }],
      }),
      BlockedUser.find({
        $or: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      }),
    ]);

    connectedUserIds = connections.map(
      c =>
        new Types.ObjectId(
          c.sentBy.toString() === userId
            ? c.receivedBy.toString()
            : c.sentBy.toString()
        )
    );

    blockedUserIds = blockedUsers.map(b =>
      b.blockerId.equals(currentUserId) ? b.blockedId : b.blockerId
    );
  }

  // Build query
  const query: Record<string, any> = {
    isDeleted: false,
    userId: { $nin: blockedUserIds },
  };

  // Add media filtering to main query if mediaType is specified
  if (
    mediaType &&
    (mediaType === MediaType.IMAGE || mediaType === MediaType.VIDEO)
  ) {
    query.media = { $exists: true, $ne: [] }; // Only posts with media
  }

  if (userId) {
    query.$or = [
      { postType: PostType.USER, privacy: PostPrivacy.PUBLIC },
      {
        postType: PostType.USER,
        privacy: PostPrivacy.FRIENDS,
        userId: { $in: connectedUserIds },
      },
      {
        postType: PostType.USER,
        privacy: {
          $in: [PostPrivacy.PUBLIC, PostPrivacy.FRIENDS, PostPrivacy.PRIVATE],
        },
        userId: currentUserId,
      },
    ];
  } else {
    query.postType = PostType.USER;
    query.privacy = PostPrivacy.PUBLIC;
  }

  // Dynamic populate based on mediaType filter
  const mediaPopulate =
    mediaType &&
    (mediaType === MediaType.IMAGE || mediaType === MediaType.VIDEO)
      ? {
          path: 'media',
          match: { mediaType: mediaType }, // Only populate matching media types
          select: 'mediaType mediaUrl',
        }
      : {
          path: 'media',
          select: 'mediaType mediaUrl',
        };

  // Set population
  options.populate = [
    mediaPopulate,
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

  options.sortBy = 'createdAt';
  options.sortOrder = -1;

  let posts = await Post.paginate(query, options);

  // Filter posts that have the requested media type after population
  if (
    mediaType &&
    (mediaType === MediaType.IMAGE || mediaType === MediaType.VIDEO)
  ) {
    posts.results = posts.results.filter(
      post => post.media && post.media.length > 0
    );
  }

  return posts;
};

// Get user timeline posts
const getUserTimelinePosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> => {
  const { username, userId } = filters;

  // Validate inputs
  if (!username) {
    throw new ApiError(400, 'Username is required');
  }
  if (userId && !Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  // Fetch requested user
  const requestedUser = await User.findOne({ username });
  if (!requestedUser) {
    throw new ApiError(404, 'User not found');
  }

  let currentUserId: Types.ObjectId | null = userId
    ? new Types.ObjectId(userId)
    : null;
  let connectedUserIds: Types.ObjectId[] = [];
  let blockedUserIds: Types.ObjectId[] = [];

  if (currentUserId) {
    // Parallelize queries
    const [connections, blockedUsers] = await Promise.all([
      Connections.find({
        status: ConnectionStatus.ACCEPTED,
        $or: [{ sentBy: currentUserId }, { receivedBy: currentUserId }],
      }),
      BlockedUser.find({
        $or: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      }),
    ]);

    connectedUserIds = connections.map(
      c =>
        new Types.ObjectId(
          c.sentBy.toString() === userId
            ? c.receivedBy.toString()
            : c.sentBy.toString()
        )
    );

    blockedUserIds = blockedUsers.map(b =>
      b.blockerId.equals(currentUserId) ? b.blockedId : b.blockerId
    );

    // Check if requested user is blocked
    if (blockedUserIds.some(id => id.equals(requestedUser._id))) {
      return {
        results: [],
        page: 1,
        limit: options.limit || 10,
        totalPages: 0,
        totalResults: 0,
      };
    }
  }

  // Build query
  const query: Record<string, any> = {
    postType: PostType.USER,
    userId: requestedUser._id,
    sourceId: requestedUser._id,
    isDeleted: false,
  };

  if (currentUserId) {
    query.$or = [
      { privacy: PostPrivacy.PUBLIC },
      { privacy: PostPrivacy.FRIENDS, userId: { $in: connectedUserIds } },
      {
        privacy: {
          $in: [PostPrivacy.PUBLIC, PostPrivacy.FRIENDS, PostPrivacy.PRIVATE],
        },
        userId: currentUserId,
      },
    ];
  } else {
    query.privacy = PostPrivacy.PUBLIC;
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
  options.sortOrder = -1;

  let posts = await Post.paginate(query, options);
  // Filter posts
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
  const { groupId, userId } = filters;

  // Validate inputs
  if (!groupId || !Types.ObjectId.isValid(groupId)) {
    throw new ApiError(400, 'Invalid group ID');
  }
  if (userId && !Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  // Check group membership
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }
  let currentUserId: Types.ObjectId | null = userId
    ? new Types.ObjectId(userId)
    : null;
  let connectedUserIds: Types.ObjectId[] = [];
  let blockedUserIds: Types.ObjectId[] = [];

  if (currentUserId) {
    // Parallelize queries
    const [connections, blockedUsers] = await Promise.all([
      Connections.find({
        status: ConnectionStatus.ACCEPTED,
        $or: [{ sentBy: currentUserId }, { receivedBy: currentUserId }],
      }),
      BlockedUser.find({
        $or: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      }),
    ]);

    connectedUserIds = connections.map(
      c =>
        new Types.ObjectId(
          c.sentBy.toString() === userId
            ? c.receivedBy.toString()
            : c.sentBy.toString()
        )
    );

    blockedUserIds = blockedUsers.map(b =>
      b.blockerId.equals(currentUserId) ? b.blockedId : b.blockerId
    );
  }

  // Build query
  const query: Record<string, any> = {
    postType: PostType.GROUP,
    sourceId: new Types.ObjectId(groupId),
    isDeleted: false,
    userId: { $nin: blockedUserIds },
  };

  if (currentUserId) {
    query.$or = [
      { privacy: PostPrivacy.PUBLIC },
      { privacy: PostPrivacy.FRIENDS, userId: { $in: connectedUserIds } },
      {
        privacy: {
          $in: [PostPrivacy.PUBLIC, PostPrivacy.FRIENDS, PostPrivacy.PRIVATE],
        },
        userId: currentUserId,
      },
    ];
  } else {
    query.privacy = PostPrivacy.PUBLIC;
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
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;

  return Post.paginate(query, options);
};

// Get event posts
const getEventPosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IPost>> => {
  const { eventId, userId } = filters;

  // Validate inputs
  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, 'Invalid event ID');
  }
  if (userId && !Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  // Check event participation
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }
  if (
    userId &&
    !event.interestedUsers.some(interestedId => interestedId.equals(userId))
  ) {
    throw new ApiError(403, 'User is not a participant of this event');
  }

  let currentUserId: Types.ObjectId | null = userId
    ? new Types.ObjectId(userId)
    : null;
  let connectedUserIds: Types.ObjectId[] = [];
  let blockedUserIds: Types.ObjectId[] = [];

  if (currentUserId) {
    // Parallelize queries
    const [connections, blockedUsers] = await Promise.all([
      Connections.find({
        status: ConnectionStatus.ACCEPTED,
        $or: [{ sentBy: currentUserId }, { receivedBy: currentUserId }],
      }),
      BlockedUser.find({
        $or: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      }),
    ]);

    connectedUserIds = connections.map(
      c =>
        new Types.ObjectId(
          c.sentBy.toString() === userId
            ? c.receivedBy.toString()
            : c.sentBy.toString()
        )
    );
    blockedUserIds = blockedUsers.map(b =>
      b.blockerId.equals(currentUserId) ? b.blockedId : b.blockerId
    );
  }

  // Build query
  const query: Record<string, any> = {
    postType: PostType.EVENT,
    sourceId: new Types.ObjectId(eventId),
    isDeleted: false,
    userId: { $nin: blockedUserIds },
  };

  if (currentUserId) {
    query.$or = [
      { privacy: PostPrivacy.PUBLIC },
      { privacy: PostPrivacy.FRIENDS, userId: { $in: connectedUserIds } },
      {
        privacy: {
          $in: [PostPrivacy.PUBLIC, PostPrivacy.FRIENDS, PostPrivacy.PRIVATE],
        },
        userId: currentUserId,
      },
    ];
  } else {
    query.privacy = PostPrivacy.PUBLIC;
  }

  // Build query
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
  options.sortOrder = -1;
  return Post.paginate(query, options);
};

// Get post by id
function extractHashtags(content: string): string[] {
  const regex = /#(\w+)/g;
  const matches = content.match(regex) || [];
  return matches;
}

// Get post by id
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
    {
      path: 'comments',
      populate: [
        { path: 'userId', select: 'fullName username profileImage' },
        { path: 'mentions', select: 'fullName username profileImage' },
        {
          path: 'reactions',
          populate: {
            path: 'userId',
            select: 'fullName username profileImage',
          },
        },
        {
          path: 'replies',
          populate: [
            { path: 'userId', select: 'fullName username profileImage' },
            { path: 'mentions', select: 'fullName username profileImage' },
            {
              path: 'reactions',
              populate: {
                path: 'userId',
                select: 'fullName username profileImage',
              },
            },
            {
              path: 'replies',
              populate: [
                { path: 'userId', select: 'fullName username profileImage' },
                { path: 'mentions', select: 'fullName username profileImage' },
                {
                  path: 'reactions',
                  populate: {
                    path: 'userId',
                    select: 'fullName username profileImage',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;

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

// Increment itinerary view count
const incrementItineraryViewCount = async (
  postId: string,
  itineraryId: string
) => {
  const post = await Post.findOne({
    _id: new Types.ObjectId(postId),
    itinerary: new Types.ObjectId(itineraryId),
  });
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  post.itineraryViewCount += 1;
  await post.save();

  // Send notification
  const notification: INotification = {
    senderId: undefined, // No specific sender for view count
    receiverId: post.userId,
    title: `Someone viewed your itinerary`,
    message: `Your itinerary in post "${post.content?.substring(
      0,
      50
    )}..." was viewed!`,
    type: 'post',
    linkId: postId,
    role: 'user',
    viewStatus: false,
    image: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await NotificationService.addCustomNotification(
    'notification',
    notification,
    post.userId.toString()
  );
  return post;
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
  incrementItineraryViewCount,
};
