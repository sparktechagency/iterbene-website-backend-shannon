export interface PaginateOptions {
  limit?: number;
  page?: number;
  sortBy?: string;
  select?: string;
  populate?: any; 
  sortOrder?: number;
  reverse?: boolean;
}

export interface PaginateResult<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}
