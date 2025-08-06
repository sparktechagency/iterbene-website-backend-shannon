import { z } from 'zod';

const createUserValidationSchema = z.object({
  body: z.object({
    fullName: z.string({
      required_error: 'Full name is required.',
      invalid_type_error: 'Full name must be a string.',
    }),
    email: z
      .string({
        required_error: 'Email is required.',
        invalid_type_error: 'Email must be a string.',
      })
      .email('Invalid email format.'),
    //password must be 8 characters and 1 uppercase, 1 lowercase, 1 special character
    password: z
      .string({
        required_error: 'Password is required.',
        invalid_type_error: 'Password must be a string.',
      })
      .min(8, 'Password must be at least 8 characters long.')
  }),
});

const setLatestLocationValidationSchema = z.object({
  body: z.object({
    latitude: z.string({
      required_error: 'Latitude is required.',
      invalid_type_error: 'Latitude must be a string.',
    }),
    longitude: z.string({
      required_error: 'Longitude is required.',
      invalid_type_error: 'Longitude must be a string.',
    }),
    locationName: z.string({
      required_error: 'Location name is required.',
      invalid_type_error: 'Location name must be a string.',
    }),
    city: z
      .string({
        required_error: 'City is required.',
        invalid_type_error: 'City must be a string.',
      })
      .optional(),
    state: z
      .string({
        required_error: 'State is required.',
        invalid_type_error: 'State must be a string.',
      })
      .optional(),
    country: z
      .string({
        required_error: 'Country is required.',
        invalid_type_error: 'Country must be a string.',
      })
      .optional(),
  }),
});

const completeProfileValidationSchema = z.object({
  body: z.object({
    gender: z.enum(['Male', 'Female'], {
      errorMap: () => ({
        message: 'Invalid gender. Valid options: Male, Female',
      }),
    }),
    age: z.string({
      required_error: 'Age is required.',
      invalid_type_error: 'Age must be a number.',
    }),
    fullName: z.string({
      required_error: 'Full name is required.',
      invalid_type_error: 'Full name must be a string.',
    }),
    religion: z.string({
      required_error: 'Religion is required.',
      invalid_type_error: 'Religion must be a string.',
    }),
    kids: z.enum(['Yes', 'No'], {
      errorMap: () => ({
        message: 'Invalid kids status. Valid options: Yes, NO',
      }),
    }),
    maritalStatus: z.enum(['Single', 'Divorced', 'Separated', 'Widowed'], {
      errorMap: () => ({
        message:
          'Invalid marital status. Valid options: Single, Divorced, Separated, Widowed',
      }),
    }),
    aboutMe: z.string({ required_error: 'About Me is required.' }),
  }),
});

const changeUserStatusValidationSchema = z.object({
  body: z.object({
    status: z.string({
      required_error: 'Status is required.',
      invalid_type_error:
        'Invalid status format. Valid options: Active,Delete,Block.',
    }),
  }),
});
const PrivacyVisibility = z.enum(['Public', 'Only Me', 'Friends']);

// Zod schema for privacy settings
const privacySettingsValidationSchema = z.object({
  body: z.object({
    privacySettings: z
      .object({
        ageRange: PrivacyVisibility.optional(),
        nickname: PrivacyVisibility.optional(),
        gender: PrivacyVisibility.optional(),
        location: PrivacyVisibility.optional(),
        locationName: PrivacyVisibility.optional(),
        country: PrivacyVisibility.optional(),
        state: PrivacyVisibility.optional(),
        city: PrivacyVisibility.optional(),
        profession: PrivacyVisibility.optional(),
        aboutMe: PrivacyVisibility.optional(),
        phoneNumber: PrivacyVisibility.optional(),
        maritalStatus: PrivacyVisibility.optional(),
      })
      .strict(), // Ensures no extra fields are allowed
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  changeUserStatusValidationSchema,
  setLatestLocationValidationSchema,
  completeProfileValidationSchema,
  privacySettingsValidationSchema
};
