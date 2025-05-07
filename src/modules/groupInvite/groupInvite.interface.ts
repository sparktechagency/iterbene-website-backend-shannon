import { Model, ObjectId } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IGroupInvite {
  _id: ObjectId;
  from: ObjectId;
  to: ObjectId;
  groupId: ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

export interface IGroupInviteModel extends Model<IGroupInvite> {
  paginate(filters: Record<string, any>, options: PaginateOptions): Promise<PaginateResult<IGroupInvite>>
}