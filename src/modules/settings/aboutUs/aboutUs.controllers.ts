import { StatusCodes } from 'http-status-codes';
import { AboutUsService } from './aboutUs.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const createOrUpdateAboutUs = catchAsync(async (req, res, next) => {
  const result = await AboutUsService.createOrUpdateAboutUs(req.body);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'About us updated successfully',
    data: result,
  });
});

const getAboutUs = catchAsync(async (req, res, next) => {
  const result = await AboutUsService.getAboutUs();
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'About us fetched successfully',
    data: result,
  });
});

export const AboutUsController = {
  createOrUpdateAboutUs,
  getAboutUs,
};
