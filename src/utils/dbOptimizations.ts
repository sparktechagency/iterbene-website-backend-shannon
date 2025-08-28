import { Model, FilterQuery, PopulateOptions } from 'mongoose';

export const optimizedFind = async <T = any>(
  model: Model<T>,
  query: FilterQuery<T>,
  select?: string,
  populate?: PopulateOptions | PopulateOptions[],
  limit?: number,
  sort?: Record<string, 1 | -1>
): Promise<Array<Record<string, any>>> => {
  let queryBuilder = model.find(query);
  
  if (select) queryBuilder = queryBuilder.select(select);
  if (populate) queryBuilder = queryBuilder.populate(populate);
  if (limit) queryBuilder = queryBuilder.limit(limit);
  if (sort) queryBuilder = queryBuilder.sort(sort);
  
  return queryBuilder.lean();
};

export const getCountsInParallel = async (countQueries: Array<() => Promise<number>>): Promise<number[]> => {
  return Promise.all(countQueries.map(query => query()));
};

export const batchUserPopulate: PopulateOptions = {
  path: 'userId',
  select: 'firstName lastName username profileImage',
  options: { lean: true }
};

export const commonUserFields = 'firstName lastName username profileImage email isOnline';

export const withTransaction = async <T>(operation: () => Promise<T>): Promise<T> => {
  const session = await require('mongoose').startSession();
  try {
    session.startTransaction();
    const result = await operation();
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};