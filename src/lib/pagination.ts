/**
 * Pagination utilities for API routes
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Parse pagination parameters from request
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
  take: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
}

/**
 * Create pagination response
 */
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: number, limit?: number): {
  valid: boolean;
  error?: string;
} {
  if (page !== undefined && (isNaN(page) || page < 1)) {
    return { valid: false, error: 'Page must be a positive integer' };
  }
  
  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
    return { valid: false, error: 'Limit must be between 1 and 100' };
  }
  
  return { valid: true };
}
