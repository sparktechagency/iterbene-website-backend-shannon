import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { IHashtag } from './hashtag.interface';
import { Hashtag } from './hashtag.model';

// Get trending hashtags
const getTrendingHashtags = (limit: number = 10): Promise<IHashtag[]> => {
  return Hashtag.find().sort({ postCount: -1, updatedAt: -1 }).limit(limit);
};

// Get hashtag posts with pagination and case-insensitive search
const getHashtagPosts = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IHashtag>> => {
  const query: Record<string, any> = {
    name: { $regex: new RegExp(filters.hashtag, 'i') }, // Case-insensitive regex
  };
  options.populate = [
    {
      path: 'posts',
      populate: [
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
      ],
    },
  ];
  return Hashtag.paginate(query, options);
};

// New function: Get all hashtags with case-insensitive search option
const getHashtags = (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IHashtag>> => {
  const query: Record<string, any> = {
    name: { $regex: new RegExp(filters.searchTerm, 'i') }, // Case-insensitive regex
  };
  options.select = 'name postCount';
  const result = Hashtag.paginate(query, options);
  return result;
};

export const HashtagService = {
  getTrendingHashtags,
  getHashtagPosts,
  getHashtags,
};
