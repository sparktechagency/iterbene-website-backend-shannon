import { Response } from 'express';

type IData<T> = {
  code: number;
  message?: string;
  data?: T;
};

const sendResponse = <T>(res: Response, data: IData<T>) => {
  const resData = {
    code: data.code,
    message: data.message,
    data: {
      attributes: data.data,
    },
  };
  res.status(data.code).json(resData);
};

export default sendResponse;
