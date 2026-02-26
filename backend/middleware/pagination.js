// backend/middleware/pagination.js - Pagination middleware

/**
 * Pagination middleware pour les routes API
 * Usage: router.get('/endpoint', authenticate, paginate, handler)
 */
export const paginate = (req, res, next) => {
  // Extract pagination params from query
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'created_at';
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Validate pagination params
  if (page < 1) {
    return res.status(400).json({ error: 'Page doit être >= 1' });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Limit doit être entre 1 et 100' });
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  // Attach pagination info to request
  req.pagination = {
    page,
    limit,
    offset,
    sortBy,
    sortOrder
  };

  next();
};

/**
 * Helper function to create paginated response
 * @param {Array} data - Data array
 * @param {Number} total - Total count
 * @param {Object} pagination - Pagination params from req.pagination
 * @returns {Object} - Paginated response object
 */
export const createPaginatedResponse = (data, total, pagination) => {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

/**
 * SQL helper for pagination
 * @param {String} baseQuery - Base SQL query without LIMIT
 * @param {Object} pagination - Pagination params from req.pagination
 * @returns {String} - Query with LIMIT and OFFSET
 */
export const addPaginationToQuery = (baseQuery, pagination) => {
  const { limit, offset, sortBy, sortOrder } = pagination;
  return `${baseQuery} ORDER BY ${sortBy} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`;
};
