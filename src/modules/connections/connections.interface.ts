import { Model, ObjectId } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IConnections {
  _id: ObjectId;
  sentBy: ObjectId;
  receivedBy: ObjectId;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConnectionsModel extends Model<IConnections> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IConnections>>;
}

export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REMOVED = 'removed',
}
