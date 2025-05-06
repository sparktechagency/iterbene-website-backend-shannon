import { z } from 'zod';

const createContactToAdminValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required.',
        invalid_type_error: 'Email must be a string.',
      })
      .email('Invalid email address.'),
    name: z
      .string({
        required_error: 'Name is required.',
        invalid_type_error: 'Name must be a string.',
      })
      .min(3, 'Name must be at least 3 characters long.'),
    message: z
      .string({
        required_error: 'Message is required.',
        invalid_type_error: 'Message must be a string.',
      })
      .min(3, 'Message must be at least 3 characters long.'),
  }),
});

export const ContactValidation = {
  createContactToAdminValidationSchema,
};