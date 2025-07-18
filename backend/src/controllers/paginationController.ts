import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { detectPaginationPattern, testPattern } from '../services/PaginationDetector';
import { CustomError } from '../middleware/errorMiddleware';

// @desc    Detect pagination pattern
// @route   POST /api/pagination/detect-pagination
// @access  Private
const detectPagination = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { url, htmlContent } = req.body;

  if (!url && !htmlContent) {
    return next(new CustomError('Either URL or HTML content must be provided', 400));
  }

  const detectedPattern = await detectPaginationPattern(url, htmlContent);

  res.status(200).json({
    message: 'Pagination pattern detection initiated',
    pattern: detectedPattern,
  });
});

// @desc    Test pagination pattern
// @route   POST /api/pagination/test-pagination-pattern
// @access  Private
const testPaginationPattern = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { url, pattern, pageLimit } = req.body;

  if (!url || !pattern) {
    return next(new CustomError('URL and pattern must be provided', 400));
  }

  const testResults = await testPattern(url, pattern, pageLimit);

  res.status(200).json({
    message: 'Pagination pattern test initiated',
    results: testResults,
  });
});

export { detectPagination, testPaginationPattern };