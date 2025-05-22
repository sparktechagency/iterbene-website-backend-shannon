import { z } from 'zod';

// Utility schema for MongoDB ObjectId
const objectIdSchema = z.string({
  required_error: 'ID is required',
  invalid_type_error: 'ID must be a string',
}).regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// Group Routes Validation

// POST /groups
const createGroupValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
      invalid_type_error: 'Name must be a string',
    }),
    description: z.string().optional(),
    privacy: z.enum(['public', 'private'], {
      required_error: 'Privacy is required',
      invalid_type_error: 'Privacy must be either public or private',
    }).default('public'),
    location: z
      .object({
        latitude: z.number({
          required_error: 'Latitude is required',
          invalid_type_error: 'Latitude must be a number',
        }),
        longitude: z.number({
          required_error: 'Longitude is required',
          invalid_type_error: 'Longitude must be a number',
        }),
      })
      .optional(),
    locationName: z.string().optional(),
    coLeaders: z
      .array(objectIdSchema, {
        invalid_type_error: 'Co-leaders must be an array of valid ObjectIds',
      })
      .optional(),
    members: z
      .array(objectIdSchema, {
        invalid_type_error: 'Members must be an array of valid ObjectIds',
      })
      .optional(),
  }),
});

// POST /groups/join
const joinGroupValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
  }),
});

// POST /groups/leave
const leaveGroupValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
  }),
});

// POST /groups/approve-join
const approveJoinValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
    memberId: objectIdSchema,
  }),
});

// POST /groups/reject-join
const rejectJoinValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
    memberId: objectIdSchema,
  }),
});

// POST /groups/remove-member
const removeMemberValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
    memberId: objectIdSchema,
  }),
});

// POST /groups/promote-admin
const promoteAdminValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
    memberId: objectIdSchema,
  }),
});

// POST /groups/demote-admin
const demoteAdminValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
    adminId: objectIdSchema,
  }),
});

// POST /groups/promote-co-leader
const promoteCoLeaderValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
    memberId: objectIdSchema,
  }),
});

// POST /groups/demote-co-leader
const demoteCoLeaderValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
    coLeaderId: objectIdSchema,
  }),
});

// GET /groups/:id
const getGroupValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// PATCH /groups/:id
const updateGroupValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z
      .string({
        invalid_type_error: 'Name must be a string',
      })
      .optional(),
    description: z.string().optional(),
    groupImage: z.string().url('Group image must be a valid URL').optional(),
    privacy: z.enum(['public', 'private'], {
      invalid_type_error: 'Privacy must be either public or private',
    }).optional(),
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
    locationName: z.string().optional(),
  }),
});

// DELETE /groups/:id
const deleteGroupValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// Group Invite Routes Validation

// POST /groups/invites/send
const sendInviteValidationSchema = z.object({
  body: z.object({
    groupId: objectIdSchema,
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

// POST /groups/invites/accept
const acceptInviteValidationSchema = z.object({
  body: z.object({
    inviteId: objectIdSchema,
  }),
});

// POST /groups/invites/decline
const declineInviteValidationSchema = z.object({
  body: z.object({
    inviteId: objectIdSchema,
  }),
});

// POST /groups/invites/cancel
const cancelInviteValidationSchema = z.object({
  body: z.object({
    inviteId: objectIdSchema,
  }),
});

export const GroupValidation = {
  createGroupValidationSchema,
  joinGroupValidationSchema,
  leaveGroupValidationSchema,
  approveJoinValidationSchema,
  rejectJoinValidationSchema,
  removeMemberValidationSchema,
  promoteAdminValidationSchema,
  demoteAdminValidationSchema,
  promoteCoLeaderValidationSchema,
  demoteCoLeaderValidationSchema,
  getGroupValidationSchema,
  updateGroupValidationSchema,
  deleteGroupValidationSchema,
  sendInviteValidationSchema,
  acceptInviteValidationSchema,
  declineInviteValidationSchema,
  cancelInviteValidationSchema,
};