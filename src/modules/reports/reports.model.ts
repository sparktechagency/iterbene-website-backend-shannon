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
    reportedMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message', // Assumes a Message model exists
      required: false,
    },
    reportedPostId: {
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


reportsSchema.plugin(paginate);

export const Report = model<IReport, IReportModel>('Report', reportsSchema);
