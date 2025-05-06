import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';


export interface IReport {
  _id: string;
  reporter: Types.ObjectId;
  reportedUser: Types.ObjectId;
  reportMessage?: string;
  reportReason: string[];
  reportStatus: "pending" | "resolved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export interface IReportModel extends Model<IReport> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IReport>>;
}
