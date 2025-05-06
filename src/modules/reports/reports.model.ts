import { model, Schema } from 'mongoose';
import { IReport, IReportModel } from './reports.interface';
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
      enum: ['pending', 'resolved', 'rejected'],
      default: 'pending',
    },
    reportReason: {
      type: [String],
      required: [true, 'Report Reason is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reportsSchema.plugin(paginate);

export const Report = model<IReport, IReportModel>('Report', reportsSchema);
