"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = __importDefault(require("ws"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
class WebSocketService {
    constructor(server) {
        this.clients = new Map();
        this.wss = new ws_1.default.Server({ server });
        this.setupConnectionHandling();
        this.setupHeartbeat();
        logger_1.default.info('WebSocketService initialized.');
    }
    setupConnectionHandling() {
        this.wss.on('connection', async (ws, req) => {
            var _a, _b, _c;
            ws.isAlive = true;
            // Authentication
            const token = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split('?token=')[1];
            if (!token) {
                ws.close(1008, 'Authentication token missing');
                logger_1.default.warn('WebSocket connection attempted without token.');
                return;
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                ws.userId = decoded.id;
                if (!this.clients.has(ws.userId)) {
                    this.clients.set(ws.userId, []);
                }
                (_b = this.clients.get(ws.userId)) === null || _b === void 0 ? void 0 : _b.push(ws);
                logger_1.default.info(`WebSocket client connected: ${ws.userId}. Total connections for user: ${(_c = this.clients.get(ws.userId)) === null || _c === void 0 ? void 0 : _c.length}`);
                ws.on('pong', () => {
                    ws.isAlive = true;
                });
                ws.on('close', () => {
                    var _a;
                    this.removeClient(ws);
                    logger_1.default.info(`WebSocket client disconnected: ${ws.userId || 'unknown'}. Remaining connections for user: ${((_a = this.clients.get(ws.userId || 'unknown')) === null || _a === void 0 ? void 0 : _a.length) || 0}`);
                });
                ws.on('error', (error) => {
                    logger_1.default.error(`WebSocket error for user ${ws.userId}: ${error.message}`);
                    this.removeClient(ws);
                });
            }
            catch (error) {
                ws.close(1008, 'Authentication failed');
                logger_1.default.error(`WebSocket authentication failed: ${error.message}`);
            }
        });
        this.wss.on('error', (error) => {
            logger_1.default.error(`WebSocket server error: ${error.message}`);
        });
    }
    setupHeartbeat() {
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                const client = ws;
                if (!client.isAlive) {
                    logger_1.default.warn(`Terminating dead WebSocket connection for user: ${client.userId}`);
                    return client.terminate();
                }
                client.isAlive = false;
                client.ping();
            });
        }, 30000); // Ping clients every 30 seconds
    }
    removeClient(ws) {
        var _a;
        if (ws.userId && this.clients.has(ws.userId)) {
            const userClients = (_a = this.clients.get(ws.userId)) === null || _a === void 0 ? void 0 : _a.filter(client => client !== ws);
            if (userClients && userClients.length > 0) {
                this.clients.set(ws.userId, userClients);
            }
            else {
                this.clients.delete(ws.userId);
            }
        }
    }
    broadcastToUser(userId, event, data) {
        const userClients = this.clients.get(userId);
        if (userClients) {
            userClients.forEach(client => {
                if (client.readyState === ws_1.default.OPEN) {
                    client.send(JSON.stringify({ event, data }));
                }
            });
            logger_1.default.debug(`Broadcasted event '${event}' to user ${userId} with ${userClients.length} connections.`);
        }
        else {
            logger_1.default.debug(`No active WebSocket clients found for user ${userId}.`);
        }
    }
    broadcastToAll(event, data) {
        this.wss.clients.forEach(ws => {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(JSON.stringify({ event, data }));
            }
        });
        logger_1.default.debug(`Broadcasted event '${event}' to all ${this.wss.clients.size} connected clients.`);
    }
    close() {
        this.wss.close(() => {
            logger_1.default.info('WebSocketService closed.');
        });
    }
}
exports.WebSocketService = WebSocketService;
