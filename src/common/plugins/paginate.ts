// import { FilterQuery, Schema } from 'mongoose';
// import { PaginateOptions, PaginateResult } from '../../types/paginate';

// // Plugin function for pagination
// const paginate = <T>(schema: Schema<T>) => {
//   schema.statics.paginate = async function (
//     filter: FilterQuery<T>,
//     options: PaginateOptions
//   ): Promise<PaginateResult<T>> {
//     const limit = options.limit ?? 10;
//     const page = options.page ?? 1;
//     const skip = (page - 1) * limit;
//     const sort = options.sortBy ?? 'createdAt';
//     const select = options.select; // Get select option

//     const countPromise = this.countDocuments(filter).exec();
//     let query = this.find(filter).sort(sort).skip(skip).limit(limit);

//     // Apply select if provided
//     if (select) {
//       query = query.select(select);
//     }

//     // Apply populate if provided
//     if (options.populate) {
//       query = query.populate(options.populate);
//     }

//     const [totalResults, results] = await Promise.all([
//       countPromise,
//       query.exec(),
//     ]);

//     return {
//       results,
//       page,
//       limit,
//       totalPages: Math.ceil(totalResults / limit),
//       totalResults,
//     };
//   };
// };

// export default paginate;


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
    const sortOrder = options.sortOrder ?? 1; 

    // Count total documents
    const totalResults = await this.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalResults / limit);

    // Ensure page is within valid range
    const effectivePage = Math.min(Math.max(1, page), totalPages);

    // Calculate skip for reverse pagination (most recent on last page)
    // Total results = 16, limit = 10, totalPages = 2
    // Page 1: skip = 0 (show first 10, older messages)
    // Page 2: skip = 6 (show last 6 messages, most recent)
    const skip = Math.max(0, totalResults - limit * effectivePage);

    let query = this.find(filter)
      .sort({ [sortBy]: sortOrder }) 
      .skip(skip)
      .limit(limit);

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