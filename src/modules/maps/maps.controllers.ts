import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { MapsService } from './maps.services';

const myMaps = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await MapsService.myMaps(userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'My maps retrieved successfully',
    data: result,
  });
});

export const MapsController = {
  myMaps,
};
