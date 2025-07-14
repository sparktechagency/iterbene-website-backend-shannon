import { FilterQuery, Schema } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';


const paginate = <T>(schema: Schema<T>) => {
  schema.statics.paginate = async function (
    filter: FilterQuery<T>,
    options: PaginateOptions
  ): Promise<PaginateResult<T>> {
    const limit = options.limit ?? 10;
    const page = options.page ?? 1;
    const sortBy = options.sortBy ?? 'createdAt';
    const sortOrder = options.sortOrder ?? -1; 
    const select = options.select;
    const reverse = options.reverse ?? false;


    // Count total documents
    const totalResults = await this.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalResults / limit);

    // Ensure page is within valid range
    const effectivePage = Math.min(Math.max(1, page), totalPages || 1);

    // Calculate skip based on pagination type
    let skip: number;
    if (reverse) {
      // Reverse pagination: newest first, then go backwards
      if (totalResults === 0) {
        skip = 0;
      } else {
        skip = Math.max(0, totalResults - limit * effectivePage);
      }
    } else {
      // Normal pagination: oldest first, then go forwards
      skip = Math.max(0, (effectivePage - 1) * limit);
    }

    // Final safety check to ensure skip is never negative
    skip = Math.max(0, skip);

    let query = this.find(filter)
      .sort({ [sortBy]: sortOrder }) 
      .skip(skip)
      .limit(limit);

    // Apply select if provided
    if (select) {
      query = query.select(select);
    }

    // populate if provided
    if (options.populate) {
      query = query.populate(options.populate);
    }

    const results = await query.exec();

    return {
      results,
      page: effectivePage,
      limit,
      totalPages,
      totalResults,
    };
  };
};

export default paginate;