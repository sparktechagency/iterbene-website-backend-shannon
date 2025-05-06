import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { CountryService } from './country.services';

const getAllCountries = catchAsync(async (req, res) => {
  const result = await CountryService.fetchAllCountries();
  const formattedResult = result.map((country: any) => {
    return {
      name: country?.country,
      value: country?.country,
    };
  });
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Country fetched successfully',
    data: formattedResult,
  });
});

const getStatesByCountry = catchAsync(async (req, res) => {
  const { country } = req.params;
  const result = await CountryService.fetchStatesByCountry(country);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'States fetched successfully',
    data: result,
  });
});

const getCitiesByState = catchAsync(async (req, res) => {
  const { country, state } = req.params;
  const result = await CountryService.fetchCitiesByState(country, state);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Cities fetched successfully',
    data: result,
  });
});

export const CountryController = {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
};
