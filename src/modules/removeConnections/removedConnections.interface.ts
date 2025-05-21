import { Types } from 'mongoose';
export interface IRemovedConnection {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  removedUserId: Types.ObjectId;
  removedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

