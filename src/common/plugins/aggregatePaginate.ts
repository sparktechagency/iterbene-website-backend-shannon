import { Aggregate, Schema } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

// Plugin function for aggregation pagination
const aggregatePaginate = <T>(schema: Schema<T>) => {
  schema.statics.aggregatePaginate = async function (
    aggregate: Aggregate<any[]>,
    options: PaginateOptions
  ): Promise<PaginateResult<T>> {
    const limit = options.limit ?? 10;
    const page = options.page ?? 1;
    const skip = (page - 1) * limit;
    const sort = options.sortBy ?? 'createdAt';

    // Clone the aggregate to avoid modifying the original
    const countAggregate = (this as any).aggregate(aggregate.pipeline());

    // Get total count using $count stage
    const countPromise = countAggregate
      .append({ $count: 'total' })
      .exec()
      .then((result: { total: number }[]) => {
        return result.length > 0 ? result[0].total : 0;
      });

    // Apply sorting, skip, and limit to the main aggregate
    let query = aggregate.sort(sort).skip(skip).limit(limit);

    // Apply select if provided (using $project)
    if (options.select) {
      const selectFields = options.select
        .split(' ')
        .reduce((acc: Record<string, number>, field: string) => {
          acc[field.replace(/^-/, '')] = field.startsWith('-') ? 0 : 1;
          return acc;
        }, {});
      query = query.append({ $project: selectFields });
    }

    // Apply populate if provided
    if (options.populate) {
      query = query.append({
        $lookup: options.populate.map((pop: any) => ({
          from:
            pop.path === 'sentBy' || pop.path === 'receivedBy'
              ? 'users'
              : pop.path,
          localField: pop.path,
          foreignField: '_id',
          as: pop.path,
          pipeline: [
            {
              $project: pop.select
                ? pop.select
                    .split(' ')
                    .reduce((acc: Record<string, number>, field: string) => {
                      acc[field] = 1;
                      return acc;
                    }, {})
                : undefined,
            },
          ].filter((stage): stage is { $project: any } => stage !== undefined),
        })),
      });

      // Unwind the populated fields to match the structure of regular populate
      query = query.append(
        options.populate.map((pop: any) => ({
          $unwind: { path: `$${pop.path}`, preserveNullAndEmptyArrays: true },
        }))
      );
    }

    const [totalResults, results] = await Promise.all([
      countPromise,
      query.exec(),
    ]);

    return {
      results,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  };
};

export default aggregatePaginate;
