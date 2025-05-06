import { StatusCodes } from 'http-status-codes';
import { PrivacyPolicyService } from './privacyPolicy.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const createOrUpdatePrivacyPolicy = catchAsync(async (req, res, next) => {
  const result = await PrivacyPolicyService.createOrUpdatePrivacyPolicy(
    req.body
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Privacy Policy updated successfully',
    data: result,
  });
});

const getPrivacyPolicy = catchAsync(async (req, res, next) => {
  const result = await PrivacyPolicyService.getPrivacyPolicy();
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Privacy Policy fetched successfully',
    data: result,
  });
});

export const PrivacyPolicyController = {
  createOrUpdatePrivacyPolicy,
  getPrivacyPolicy,
};
