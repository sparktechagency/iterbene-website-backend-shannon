import { sendSupportMessageEmail } from '../../helpers/emailService';
import { IContact } from './contact.interface';
import { Contact } from './contact.model';

const createContactToAdmin = async (payload: IContact) => {
  const result = await Contact.create(payload);
  //send email to admin
  sendSupportMessageEmail(
    payload.email,
    payload.name,
    payload.message
  );
  return result;
};

export const ContactService = {
  createContactToAdmin,
};
