import { model, Schema } from 'mongoose';
import { IContact, IContactModal } from './contact.interface';
import paginate from '../../common/plugins/paginate';

const contactSchema = new Schema<IContact>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.plugin(paginate);

export const Contact = model<IContact, IContactModal>('Contact', contactSchema);
