import axios from 'axios';


 const fetchAllCountries = async () => {
  const response = await axios.get(
    'https://countriesnow.space/api/v0.1/countries'
  );
  return response.data.data;
};

 const fetchStatesByCountry = async (country: string) => {
  const response = await axios.post(
    'https://countriesnow.space/api/v0.1/countries/states',
    { country }
  );
  return response.data.data.states;
};

 const fetchCitiesByState = async (country: string, state: string) => {
  const response = await axios.post(
    'https://countriesnow.space/api/v0.1/countries/state/cities',
    { country, state }
  );
  return response.data.data.cities;
};

export const CountryService = {
  fetchAllCountries,
  fetchStatesByCountry,
  fetchCitiesByState,
};