"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.refreshToken = exports.loginUser = exports.registerUser = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = __importDefault(require("../../models/User")); // Adjust path as needed
const errorMiddleware_1 = require("../middleware/errorMiddleware");
// Assert the type of the imported User model
const UserModel = User_1.default;
// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { username, email, password } = req.body;
    // Check if user exists
    const userExists = await User_1.default.findOne({ where: { email } });
    if (userExists) {
        throw new errorMiddleware_1.CustomError('User already exists', 400);
    }
    // Hash password
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    // Create user
    const user = await UserModel.create({
        username: username, // Cast to string
        email: email, // Cast to string
        password_hash: hashedPassword, // Use password_hash
    });
    if (user) {
        res.status(201).json({
            token: (0, authMiddleware_1.generateToken)(user.id), // Ensure id is number
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    }
    else {
        throw new errorMiddleware_1.CustomError('Invalid user data', 400);
    }
});
exports.registerUser = registerUser;
// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    // Check for user email
    const user = await UserModel.findOne({ where: { email } }); // Cast to UserInstance
    if (user && (await bcryptjs_1.default.compare(password, user.password_hash))) { // Use password_hash
        res.json({
            token: (0, authMiddleware_1.generateToken)(user.id), // Ensure id is number
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    }
    else {
        throw new errorMiddleware_1.CustomError('Invalid credentials', 400);
    }
});
exports.loginUser = loginUser;
// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = (0, express_async_handler_1.default)(async (req, res) => {
    // Assuming the protect middleware has already validated the token and set req.user
    if (!req.user) {
        throw new errorMiddleware_1.CustomError('Not authorized, no user data in token', 401);
    }
    // Generate a new token for the authenticated user
    const newToken = (0, authMiddleware_1.generateToken)(req.user.id);
    res.status(200).json({
        token: newToken,
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
        },
    });
});
exports.refreshToken = refreshToken;
// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public (or Private, depending on implementation)
const logoutUser = (0, express_async_handler_1.default)(async (req, res) => {
    // For JWT, logout is typically handled client-side by deleting the token.
    // We can send a success message.
    res.status(200).json({ message: 'Logged out successfully' });
});
exports.logoutUser = logoutUser;
