import { Schema, model } from 'mongoose';
import { TToken, TokenModel, TokenType } from './token.interface';

const tokenSchema = new Schema<TToken, TokenModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TokenType),
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0' },
    },
  },
  {
    timestamps: true,
  }
);

tokenSchema.statics.isExistTokenByUserId = async function (
  userId: string,
  type: string
) {
  return await this.findOne({ user: userId, type });
};

tokenSchema.index({ user: 1, type: 1 });

export const Token = model<TToken, TokenModel>('Token', tokenSchema);
