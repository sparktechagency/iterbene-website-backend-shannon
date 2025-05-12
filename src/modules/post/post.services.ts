import { Types } from 'mongoose';
import { MediaType, SourceType } from '../media/media.interface';
import { IPost, PostPrivacy, PostType } from './post.interface';
import ApiError from '../../errors/ApiError';
import Group from '../group/group.model';
import { Event } from '../event/event.model';
import { Itinerary } from '../Itinerary/itinerary.model';
import { Hashtag } from '../hastag/hashtag.model';
import { Media } from '../media/media.model';
import { Post } from './post.model';
interface CreatePostInput {
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

interface SharePostInput {
  userId: Types.ObjectId;
  originalPostId: string;
  content?: string;
  privacy: PostPrivacy;
}

async function createPost(payload: CreatePostInput): Promise<IPost> {
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

  // Validate input
  if (!Object.values(PostType).includes(postType)) {
    throw new ApiError(400, 'Invalid post type');
  }
  if (!Object.values(PostPrivacy).includes(privacy)) {
    throw new ApiError(400, 'Invalid privacy setting');
  }

  // Validate sourceId
  if (sourceId && postType === PostType.GROUP) {
    const group = await Group.findById(sourceId);
    if (!group || group.isDeleted) throw new ApiError(404, 'Group not found');
  }
  if (sourceId && postType === PostType.EVENT) {
    const event = await Event.findById(sourceId);
    if (!event || event.isDeleted) throw new ApiError(404, 'Event not found');
  }
  if (postType !== PostType.TIMELINE && !sourceId) {
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

  mediaData = await Promise.all(
    files!.map(async file => {
      const mediaUrl = `uploads/posts/${file.filename}`;
      const thumbnailUrl = file.mimetype.startsWith('video')
        ? `uploads/posts/thumbnails/placeholder.jpg`
        : `uploads/posts/${file.filename}`;
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
        mediaUrl,
        thumbnailUrl,
      };
    })
  );

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
    media: mediaDocs.map(m => m._id),
    itinerary,
    hashtags: normalizedHashtags,
    privacy,
    visitedLocation,
    visitedLocationName,
  });

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

async function sharePost(input: SharePostInput): Promise<IPost> {
  const { userId, originalPostId, content, privacy } = input;

  const originalPost = await Post.findById(originalPostId);
  if (!originalPost) {
    throw new ApiError(404, 'Original post not found');
  }

  const sharedPost = await Post.create({
    userId,
    content: content || '',
    postType: PostType.TIMELINE,
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

async function getPosts(
  filter: {
    mediaType?: MediaType;
    hashtag?: string;
    itinerary?: boolean;
    postType?: PostType;
    userId?: string;
  },
  options: { page: number; limit: number }
): Promise<any> {
  const { mediaType, hashtag, itinerary, postType, userId } = filter;
  const { page, limit } = options;

  const query: any = {};
  if (postType) query.postType = postType;
  if (hashtag) query.hashtags = hashtag.toLowerCase();
  if (itinerary) query.itinerary = { $exists: true };
  if (userId) query.userId = userId;
  if (mediaType) {
    const mediaIds = await Media.find({ mediaType }).distinct('_id');
    query.media = { $in: mediaIds };
  }

  return Post.paginate(query, {
    page,
    limit,
    populate: ['media', 'itinerary', 'userId', 'sourceId'],
  });
}

async function getPostsByHashtag(
  hashtag: string,
  page: number,
  limit: number
): Promise<any> {
  return getPosts({ hashtag }, { page, limit });
}

function extractHashtags(content: string): string[] {
  const regex = /#(\w+)/g;
  const matches = content.match(regex) || [];
  return matches.map(tag => tag.slice(1).toLowerCase());
}

export const PostServices = {
  createPost,
  sharePost,
  getPosts,
  getPostsByHashtag,
};
