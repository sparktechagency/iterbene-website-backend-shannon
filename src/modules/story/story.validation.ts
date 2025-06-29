import { z } from 'zod';
import { StoryPrivacy, ReactionType } from './story.interface';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');


// POST /stories
const createStoryValidationSchema = z.object({
  body: z.object({
    textContent: z.string().optional(),
    privacy: z
      .enum(Object.values(StoryPrivacy) as [StoryPrivacy, ...StoryPrivacy[]])
      .default(StoryPrivacy.FOLLOWERS),
    backgroundColor: z.string().optional(),
  }),
});


// DELETE /stories/:id
const deleteStoryValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// POST /stories/view
const viewStoryValidationSchema = z.object({
  body: z.object({
    mediaId: objectIdSchema,
  }),
});

// POST /stories/react
const reactStoryValidationSchema = z.object({
  body: z.object({
    mediaId: objectIdSchema,
    reactionType: z.enum(
      Object.values(ReactionType) as [ReactionType, ...ReactionType[]]
    ),
  }),
});

// POST /stories/reply
const replyStoryValidationSchema = z.object({
  body: z.object({
    mediaId: objectIdSchema,
    message: z.string().min(1, 'Reply message is required'),
  }),
});

export const StoryValidation = {
  createStoryValidationSchema,
  deleteStoryValidationSchema,
  viewStoryValidationSchema,
  reactStoryValidationSchema,
  replyStoryValidationSchema,
};
