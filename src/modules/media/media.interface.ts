import { Types } from 'mongoose';

export interface IMedia {
  _id: Types.ObjectId;
  sourceId: Types.ObjectId;
  sourceType: SourceType;
  mediaType: MediaType;
  mediaUrl: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum MediaType {
  TEXT = 'text',
  MIXED = 'mixed',
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum SourceType {
  USER = 'User',
  COMMENT = 'Comment',
  GROUP = 'Group',
  EVENT = 'Event',
}