"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPaginationPattern = exports.detectPagination = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const PaginationDetector_1 = require("../services/PaginationDetector");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
// @desc    Detect pagination pattern
// @route   POST /api/pagination/detect-pagination
// @access  Private
const detectPagination = (0, express_async_handler_1.default)(async (req, res, next) => {
    const { url, htmlContent } = req.body;
    if (!url && !htmlContent) {
        return next(new errorMiddleware_1.CustomError('Either URL or HTML content must be provided', 400));
    }
    const detectedPattern = await (0, PaginationDetector_1.detectPaginationPattern)(url, htmlContent);
    res.status(200).json({
        message: 'Pagination pattern detection initiated',
        pattern: detectedPattern,
    });
});
exports.detectPagination = detectPagination;
// @desc    Test pagination pattern
// @route   POST /api/pagination/test-pagination-pattern
// @access  Private
const testPaginationPattern = (0, express_async_handler_1.default)(async (req, res, next) => {
    const { url, pattern, pageLimit } = req.body;
    if (!url || !pattern) {
        return next(new errorMiddleware_1.CustomError('URL and pattern must be provided', 400));
    }
    const testResults = await (0, PaginationDetector_1.testPattern)(url, pattern, pageLimit);
    res.status(200).json({
        message: 'Pagination pattern test initiated',
        results: testResults,
    });
});
exports.testPaginationPattern = testPaginationPattern;
