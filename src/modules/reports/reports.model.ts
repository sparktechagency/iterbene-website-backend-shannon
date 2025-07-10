// reports.schema.ts
import { model, Schema } from 'mongoose';
import {
  IReport,
  IReportModel,
  ReportStatus,
  ReportType,
} from './reports.interface';
import paginate from '../../common/plugins/paginate';

const reportsSchema = new Schema<IReport, IReportModel>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter ID is required'],
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reported User ID is required'],
    },
    reportMessage: {
      type: String,
    },
    reportStatus: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING,
    },
    reportReason: {
      type: [String],
      required: [true, 'Report Reason is required'],
      default: [],
    },
    reportType: {
      type: String,
      enum: Object.values(ReportType),
      required: [true, 'Report Type is required'],
    },
    reportedMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message', // Assumes a Message model exists
      required: false,
    },
    reportedPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post', // Reference to Post model
      required: false,
    },
    reportedCommentId: {
      type: Schema.Types.ObjectId, // ID of the comment within the Post
      required: false,
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to validate reported entity based on reportType
reportsSchema.pre('save', function (next) {
  const report = this as IReport;

  // Clear irrelevant fields based on reportType
  if (report.reportType !== ReportType.MESSAGE) {
    report.reportedMessage = undefined;
  }
  if (
    report.reportType !== ReportType.COMMENT &&
    report.reportType !== ReportType.POST
  ) {
    report.reportedPost = undefined;
    report.reportedCommentId = undefined;
  }
  if (report.reportType !== ReportType.COMMENT) {
    report.reportedCommentId = undefined;
  }

  // Validate required fields based on reportType
  if (report.reportType === ReportType.MESSAGE && !report.reportedMessage) {
    return next(
      new Error('Reported message ID is required for MESSAGE reports')
    );
  }
  if (
    report.reportType === ReportType.COMMENT &&
    (!report.reportedPost || !report.reportedCommentId)
  ) {
    return next(
      new Error(
        'Reported post ID and comment ID are required for COMMENT reports'
      )
    );
  }
  if (report.reportType === ReportType.POST && !report.reportedPost) {
    return next(new Error('Reported post ID is required for POST reports'));
  }
  if (report.reportType === ReportType.POST && report.reportedCommentId) {
    return next(new Error('Comment ID is not allowed for POST reports'));
  }
  if (
    report.reportType === ReportType.USER &&
    (report.reportedMessage || report.reportedPost || report.reportedCommentId)
  ) {
    return next(new Error('No reported entity is allowed for USER reports'));
  }

  next();
});

reportsSchema.plugin(paginate);

export const Report = model<IReport, IReportModel>('Report', reportsSchema);
