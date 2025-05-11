import { Types } from 'mongoose';

export interface IMedia {
  _id?: Types.ObjectId;
  sourceId: Types.ObjectId;
  sourceType: string;
  mediaType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  textContent?: string;
  metadata?: {
    resolution?: string;
    fileSize?: number;
  };
  expiresAt?: Date;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
  USER = 'user',
  COMMENT = 'comment',
  GROUP = 'group',
  EVENT = 'event',
  STORY = 'story',
}