"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'combined.log' }),
    ],
});
exports.logger = logger;
const requestLogger = (req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip, body: req.body });
    next();
};
exports.requestLogger = requestLogger;
