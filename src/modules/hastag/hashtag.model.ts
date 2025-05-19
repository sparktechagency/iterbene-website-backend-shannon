import { model, Schema, Types } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { IHashtag, IHashtagModel } from './hashtag.interface';

const hashtagSchema = new Schema<IHashtag, IHashtagModel>({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  postCount: { type: Number, default: 0 },
  posts: [{ type: Types.ObjectId, ref: 'Post' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

hashtagSchema.plugin(paginate);

export const Hashtag = model<IHashtag, IHashtagModel>('Hashtag', hashtagSchema);
