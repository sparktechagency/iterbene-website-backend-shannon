import { z } from 'zod';

const addReportValidationSchema = z.object({
  body: z.object({
    reportedUser: z.string({
      required_error: 'Reported User ID is required',
      invalid_type_error: 'Reported User ID must be a string',
    }),
    reportMessage: z.string({
      required_error: 'Report Message is required',
      invalid_type_error: 'Report Message must be a string',
    }),
    // reportReason: z.array(z.string(), ({
    //   required_error: 'Report Reason is required',
    //   invalid_type_error: 'Report Reason must be a string',
    // }))
  }),
});


export const ReportValidation = {
  addReportValidationSchema
};
