import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { AdminServices } from './admin.service';
import ApiError from '../../errors/ApiError';
import pick from '../../shared/pick';

const getDashboardData = catchAsync(async (req, res, next) => {
  const result = await AdminServices.getDashboardData();
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

const userActivityGraphChart = catchAsync(async (req, res, next) => {
  const { period } = req.query;
  if (!period || typeof period !== 'string' || !['monthly', 'weekly', 'yearly'].includes(period)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Period must be one of "monthly", "weekly", or "yearly"');
    return;
  }
  const result = await AdminServices.userActivityGraphChart(period as 'weekly' | 'monthly' | 'yearly' );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User activity and match success graph chart retrieved successfully',
    data: result,
  });
})


export const AdminController = {
  getDashboardData,
  userActivityGraphChart,
};
