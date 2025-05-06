import { StatusCodes } from 'http-status-codes';
import { ContactService } from './contact.services';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';

const createContactToAdmin = catchAsync(async (req, res, next) => {
  const result = await ContactService.createContactToAdmin(req.body);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Contact added successfully',
    data: result,
  });
});

export const ContactController = {
  createContactToAdmin,
};