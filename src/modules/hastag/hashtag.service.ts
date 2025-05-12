import { Hashtag } from './hashtag.model';

async function getTrendingHashtags(limit: number = 10): Promise<any> {
  return Hashtag.find().sort({ postCount: -1, updatedAt: -1 }).limit(limit);
}

async function getHashtagPosts(
  hashtag: string,
  page: number,
  limit: number
): Promise<any> {
  return Hashtag.paginate(
    { _id: hashtag.toLowerCase() },
    {
      page,
      limit,
      populate: {
        path: 'posts',
        populate: ['media', 'itinerary', 'userId', 'sourceId'],
      },
    }
  );
}

export const HashtagService = {
  getTrendingHashtags,
  getHashtagPosts,
};
