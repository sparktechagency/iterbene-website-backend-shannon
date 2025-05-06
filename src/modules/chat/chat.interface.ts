import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export enum ChatType {
  GROUP = 'group',
  SINGLE = 'single',
}

export interface IChat {
  _id: string;
  chatType: ChatType;
  participants: Types.ObjectId[];
  chatName?: string;
  lastMessage: Types.ObjectId;
  isGroupChat?: boolean;
  groupAdmin?: Types.ObjectId;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChatModel extends Model<IChat> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IChat>>;
}
