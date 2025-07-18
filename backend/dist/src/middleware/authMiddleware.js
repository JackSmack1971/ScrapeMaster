"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const User_1 = __importDefault(require("../../models/User")); // Adjust path as needed
// Assert the type of the imported User model
const UserModel = User_1.default;
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey', {
        expiresIn: '24h',
    });
};
exports.generateToken = generateToken;
const protect = (0, express_async_handler_1.default)(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
            // Get user from the token
            const user = await UserModel.findByPk(decoded.id);
            if (!user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }
            req.user = user.toJSON(); // Convert Sequelize instance to plain object and cast to IUser
            next();
        }
        catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});
exports.protect = protect;
