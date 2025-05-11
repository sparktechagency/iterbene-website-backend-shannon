import { z } from 'zod';

// Utility schema for MongoDB ObjectId
const objectIdSchema = z.string({
  required_error: 'ID is required',
  invalid_type_error: 'ID must be a string',
}).regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// POST /events
const createEventValidationSchema = z.object({
  body: z.object({
    eventName: z.string({
      required_error: 'Event name is required',
      invalid_type_error: 'Event name must be a string',
    }),
    description: z.string().optional(),
    startDate: z.string().datetime({ message: 'Start date must be a valid ISO date' }),
    endDate: z.string().datetime({ message: 'End date must be a valid ISO date' }),
    location: z.object({
      latitude: z.number({
        required_error: 'Latitude is required',
        invalid_type_error: 'Latitude must be a number',
      }),
      longitude: z.number({
        required_error: 'Longitude is required',
        invalid_type_error: 'Longitude must be a number',
      }),
    }),
    duration: z.object({
      days: z.number({
        required_error: 'Days is required',
        invalid_type_error: 'Days must be a number',
      }),
      nights: z.number({
        required_error: 'Nights is required',
        invalid_type_error: 'Nights must be a number',
      }),
    }),
    locationName: z.string().optional(),
    privacy: z.enum(['public', 'private'], {
      required_error: 'Privacy is required',
      invalid_type_error: 'Privacy must be either public or private',
    }).default('public'),
    coHosts: z.array(objectIdSchema).optional(),
    eventCost: z.number().optional().default(0),
    interests: z.array(objectIdSchema).optional(),
  }),
});

// POST /events/join
const joinEventValidationSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
  }),
});

// POST /events/leave
const leaveEventValidationSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
  }),
});

// POST /events/remove-user
const removeUserValidationSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
    userId: objectIdSchema,
  }),
});

// POST /events/promote-co-host
const promoteCoHostValidationSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
    userId: objectIdSchema,
  }),
});

// POST /events/demote-co-host
const demoteCoHostValidationSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
    coHostId: objectIdSchema,
  }),
});

// GET /events/:id
const getEventValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// PATCH /events/:id
const updateEventValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    eventName: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().datetime({ message: 'Start date must be a valid ISO date' }).optional(),
    endDate: z.string().datetime({ message: 'End date must be a valid ISO date' }).optional(),
    location: z
      .object({
        latitude: z.number({
          invalid_type_error: 'Latitude must be a number',
        }),
        longitude: z.number({
          invalid_type_error: 'Longitude must be a number',
        }),
      })
      .optional(),
    duration: z
      .object({
        days: z.number({
          invalid_type_error: 'Days must be a number',
        }),
        nights: z.number({
          invalid_type_error: 'Nights must be a number',
        }),
      })
      .optional(),
    locationName: z.string().optional(),
    privacy: z.enum(['public', 'private']).optional(),
    eventCost: z.number().optional(),
    interests: z.array(objectIdSchema).optional(),
  }),
});

// DELETE /events/:id
const deleteEventValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});


// POST /events/invites/send
const sendInviteValidationSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
    to: z.union(
      [
        objectIdSchema,
        z.array(objectIdSchema, {
          invalid_type_error: 'To must be an array of valid ObjectIds',
        }),
      ],
      {
        required_error: 'Recipient(s) ID is required',
        invalid_type_error: 'Recipient(s) must be a valid ObjectId or array of ObjectIds',
      }
    ),
  }),
});

// POST /events/invites/accept
const acceptInviteValidationSchema = z.object({
  body: z.object({
    inviteId: objectIdSchema,
  }),
});

// POST /events/invites/decline
const declineInviteValidationSchema = z.object({
  body: z.object({
    inviteId: objectIdSchema,
  }),
});

// POST /events/invites/cancel
const cancelInviteValidationSchema = z.object({
  body: z.object({
    inviteId: objectIdSchema,
  }),
});


export const EventValidation = {
  createEventValidationSchema,
  joinEventValidationSchema,
  leaveEventValidationSchema,
  removeUserValidationSchema,
  promoteCoHostValidationSchema,
  demoteCoHostValidationSchema,
  getEventValidationSchema,
  updateEventValidationSchema,
  deleteEventValidationSchema,
  sendInviteValidationSchema,
  acceptInviteValidationSchema,
  declineInviteValidationSchema,
  cancelInviteValidationSchema,
};