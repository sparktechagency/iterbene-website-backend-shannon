// reports.validation.ts
import { z } from 'zod';
import { ReportType } from './reports.interface';

const addReportValidationSchema = z.object({
  body: z
    .object({
      reportedUser: z.string().nonempty('Reported User ID is required'),
      reportMessage: z.string().optional(),
      reportReason: z.array(z.string()).nonempty('Report Reason is required'),
      reportedMessage: z.string().optional(),
      reportedPost: z.string().optional(),
      reportedCommentId: z.string().optional(),
    })
});

const sendWarningMessageValidationSchema = z.object({
  body: z.object({
    reportedUserId: z.string().nonempty('Reported user ID is required'),
    warningMessage: z.string().nonempty('Warning message is required'),
  }),
});

const banUserValidationSchema = z.object({
  body: z.object({
    duration: z.enum(['1 Day', '1 Week', '1 Month', 'Permanent'], {
      message: 'Invalid ban duration',
    }),
  }),
  params: z.object({
    userId: z.string().nonempty('User ID is required'),
  }),
});

const unbanUserValidationSchema = z.object({
  params: z.object({
    userId: z.string().nonempty('User ID is required'),
  }),
});

export const ReportValidation = {
  addReportValidationSchema,
  sendWarningMessageValidationSchema,
  banUserValidationSchema,
  unbanUserValidationSchema,
};
