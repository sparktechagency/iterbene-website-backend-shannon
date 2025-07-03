import { z } from 'zod';
import { PostPrivacy, PostType, ReactionType } from './post.interface';

export const PostValidation = {
  createPostValidationSchema: z.object({
    body: z.object({
      content: z.string().optional(),
      itineraryId: z.string().optional(),
      postType: z.enum(Object.values(PostType) as [string, ...string[]]),
      sourceId: z.string().optional(),
      visitedLocationName: z.string().optional(),
    }),
  }),

  sharePostValidationSchema: z.object({
    body: z.object({
      originalPostId: z.string(),
      content: z.string().optional(),
      privacy: z.enum(Object.values(PostPrivacy) as [string, ...string[]]),
    }),
  }),

  addOrRemoveReactionValidationSchema: z.object({
    body: z.object({
      postId: z.string(),
      reactionType: z.enum(
        Object.values(ReactionType) as [string, ...string[]]
      ),
    }),
  }),

  addOrRemoveCommentReactionValidationSchema: z.object({
    body: z.object({
      postId: z.string(),
      commentId: z.string(),
      reactionType: z.enum(
        Object.values(ReactionType) as [string, ...string[]]
      ),
    }),
  }),

  createCommentValidationSchema: z.object({
    body: z.object({
      postId: z.string(),
      comment: z.string(),
      replyTo: z.string().optional(),
      parentCommentId: z.string().optional(),
      mentions: z.array(z.string()).optional(),
    }),
  }),

  updateCommentValidationSchema: z.object({
    body: z.object({
      postId: z.string(),
      comment: z.string(),
      mentions: z.array(z.string()).optional(),
    }),
  }),

  deleteCommentValidationSchema: z.object({
    body: z.object({
      postId: z.string(),
    }),
  }),

  updatePostValidationSchema: z.object({
    body: z.object({
      content: z.string().optional(),
      itineraryId: z.string().optional(),
      postType: z
        .enum(Object.values(PostType) as [string, ...string[]])
        .optional(),
      privacy: z
        .enum(Object.values(PostPrivacy) as [string, ...string[]])
        .optional(),
      sourceId: z.string().optional(),
      visitedLocation: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
      visitedLocationName: z.string().optional(),
    }),
  }),
};
