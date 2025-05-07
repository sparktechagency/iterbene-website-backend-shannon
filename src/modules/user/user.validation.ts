import { z } from 'zod';

const createUserValidationSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: 'First name is required.',
      invalid_type_error: 'First name must be a string.',
    }),
    lastName: z.string({
      required_error: 'Last name is required.',
      invalid_type_error: 'Last name must be a string.',
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
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Password must contain at least one special character.'
      ),
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
        message:
          'Invalid kids status. Valid options: Yes, NO',
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

export const UserValidation = {
  createUserValidationSchema,
  changeUserStatusValidationSchema,
  setLatestLocationValidationSchema,
  completeProfileValidationSchema,
};

