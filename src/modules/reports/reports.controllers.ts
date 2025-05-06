import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { ReportServices } from './reports.services';
import pick from '../../shared/pick';

const addReport = catchAsync(async (req, res) => {
  const { userId } = req.user;
  req.body.reporter = userId;
  const result = await ReportServices.addReport(req.body);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Report added successfully',
    data: result,
  });
});

const getAllReports = catchAsync(async (req, res) => {
  const filters = pick(req.query, [
    'reporterName',
    'reportedName',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const result = await ReportServices.getAllReports(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reports fetched successfully',
    data: result,
  });
});

const getSingleReport = catchAsync(async (req, res) => {
  const { reportId } = req.params;
  const result = await ReportServices.getSingleReport(reportId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Report fetched successfully',
    data: result,
  });
});


const sendWarningMessageForReportedUser = catchAsync(async (req, res) => {
  const { reportedUserId, warningMessage } = req.body;
  const result = await ReportServices.sendWarningMessageForReportedUser(
    reportedUserId,
    warningMessage
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Warning message sent successfully',
    data: result,
  });
});

const banUser = catchAsync(async (req, res) => {
  const { bannedUserId, duration } = req.body;
  const result = await ReportServices.banUser(bannedUserId, duration);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Report banned successfully',
    data: result,
  });
});
const unbanUser = catchAsync(async (req, res) => {
  const { bannedUserId } = req.body;

  const result = await ReportServices.unbanUser(bannedUserId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Report unbanned successfully',
    data: result,
  });
});
export const ReportController = {
  addReport,
  getAllReports,
  getSingleReport,
  sendWarningMessageForReportedUser,
  banUser,
  unbanUser,
};
