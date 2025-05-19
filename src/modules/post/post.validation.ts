import { z } from 'zod';

const createPostValidationSchema = z.object({
  body: z.object({
    postType: z.string({
      required_error: 'Post type is required',
      invalid_type_error: 'Post type must be a string',
    }),
    content: z
      .string({
        required_error: 'Content is required',
        invalid_type_error: 'Content must be a string',
      })
      .optional(),
    privacy: z
      .enum(['public', 'private', 'friends'], {
        invalid_type_error: 'Privacy must be either public or private',
      })
      .default('public'),
  }),
});

const addOrRemoveReactionValidationSchema = z.object({
  body: z.object({
    postId: z.string({
      required_error: 'Post ID is required',
      invalid_type_error: 'Post ID must be a string',
    }),
    reactionType: z
      .enum(['love', 'luggage', 'ban', 'smile'], {
        invalid_type_error: 'Reaction type must be a string',
      })
      .default('love'),
  }),
});

const createCommentValidationSchema = z.object({
  body: z.object({
    postId: z.string({
      required_error: 'Post ID is required',
      invalid_type_error: 'Post ID must be a string',
    }),
    comment: z.string({
      required_error: 'Content is required',
      invalid_type_error: 'Content must be a string',
    }),
    replyTo: z
      .string({
        required_error: 'Reply to is required',
        invalid_type_error: 'Reply to must be a string',
      })
      .optional(),
    parentCommentId: z
      .string({
        required_error: 'Parent comment ID is required',
        invalid_type_error: 'Parent comment ID must be a string',
      })
      .optional(),
  }),
});

const updateCommentValidationSchema = z.object({
  body: z.object({
    postId: z.string({
      required_error: 'Post ID is required',
      invalid_type_error: 'Post ID must be a string',
    }),
    comment: z.string({
      required_error: 'Content is required',
      invalid_type_error: 'Content must be a string',
    }),
  }),
})
export const PostValidation = {
  createPostValidationSchema,
};
