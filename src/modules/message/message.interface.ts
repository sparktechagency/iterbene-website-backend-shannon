import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  MIXED = 'mixed',
  STORYMESSAGE = 'storyMessage', // For story messages
}

export interface IContent {
  text?: string;
  messageType: MessageType;
  fileUrls?: string[];
}

export interface IMessage {
  _id?: string;
  chatId?: Types.ObjectId | string;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: IContent;
  seenBy?: Types.ObjectId[];
  deletedBy?: Types.ObjectId[];
  unsentBy?: Types.ObjectId[];
  storyMedia?:Types.ObjectId; // For story messages
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  reactions?: { userId: Types.ObjectId; emoji: string }[];
  replyTo?: Types.ObjectId;
  forwardedFrom?: Types.ObjectId;
  isPinned?: boolean;
  deliveryStatus?: 'sent' | 'delivered' | 'seen';
}

export interface IMessageModel extends Model<IMessage> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IMessage>>;
}