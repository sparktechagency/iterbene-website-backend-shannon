import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document', // PDF, Word, etc.
  MIXED = 'mixed', // Text + Media (Image, Audio, Video, PDF, etc.)
}

export interface IContent {
  text?: string; // Optional: Message can contain text
  messageType: MessageType;
  fileUrls?: string[]; // Array to support multiple files (Images, Audio, Video, PDFs, etc.)
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMessageModel extends Model<IMessage> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IMessage>>;
}
