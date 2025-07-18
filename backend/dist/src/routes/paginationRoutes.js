"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const paginationController_1 = require("../controllers/paginationController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect); // All pagination routes are protected
router.post('/detect-pagination', paginationController_1.detectPagination);
router.post('/test-pagination-pattern', paginationController_1.testPaginationPattern);
exports.default = router;
