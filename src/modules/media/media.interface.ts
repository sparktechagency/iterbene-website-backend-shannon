import { Types } from 'mongoose';

export interface IMedia {
  _id: Types.ObjectId;
  sourceId: Types.ObjectId;
  sourceType: SourceType;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  textContent?: string;
  altText?: string;
  caption?: string;
  metadata?: {
    resolution?: string;
    fileSize?: number;
  };
  expiresAt?: Date;
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
  TIMELINE = 'timeline',
  COMMENT = 'comment',
  GROUP = 'group',
  EVENT = 'event',
  STORY = 'story',
}