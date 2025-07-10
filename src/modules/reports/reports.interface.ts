import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IReport {
  _id: string;
  reporter: Types.ObjectId;
  reportedUser: Types.ObjectId;
  reportMessage?: string;
  reportReason: string[];
  reportStatus: ReportStatus;
  reportType: ReportType;
  reportedMessageId?: Types.ObjectId; // Reference to Message for MESSAGE reports
  reportedPostId?: Types.ObjectId; // Reference to Post for POST or COMMENT reports
  reportedCommentId?: Types.ObjectId; // ID of the comment within the Post for COMMENT reports
  createdAt: Date;
  updatedAt: Date;
}

export interface IReportModel extends Model<IReport> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IReport>>;
}

export enum ReportType {
  USER = 'user',
  POST = 'post',
  COMMENT = 'comment',
  MESSAGE = 'message',
}
export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}
