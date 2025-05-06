import { StatusCodes } from 'http-status-codes';
import { TermsConditionsService } from './termsConditions.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const createOrUpdateTermsConditions = catchAsync(async (req, res, next) => {
  const result = await TermsConditionsService.createOrUpdateTermsConditions(
    req.body
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'TermsConditions updated successfully',
    data: result,
  });
});

const getTermsConditions = catchAsync(async (req, res, next) => {
  const result = await TermsConditionsService.getTermsConditions();
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'TermsConditions fetched successfully',
    data: result,
  });
});

export const TermsConditionsController = {
  createOrUpdateTermsConditions,
  getTermsConditions,
};
