"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const router = (0, express_1.Router)();
router.post('/register', (0, validationMiddleware_1.validateRegistration)(), authController_1.registerUser);
router.post('/login', (0, validationMiddleware_1.validateLogin)(), authController_1.loginUser);
router.post('/refresh', authMiddleware_1.protect, authController_1.refreshToken);
router.post('/logout', authController_1.logoutUser);
exports.default = router;
