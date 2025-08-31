import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IGroup {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId | string;
  name: string;
  groupImage: string | null;
  privacy: GroupPrivacy;
  admins: Types.ObjectId[];
  coLeaders: Types.ObjectId[];
  members: Types.ObjectId[];
  pendingMembers: Types.ObjectId[];
  description: string;
  isDeleted: boolean;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum GroupPrivacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export interface IGroupModel extends Model<IGroup> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IGroup>>;
}
