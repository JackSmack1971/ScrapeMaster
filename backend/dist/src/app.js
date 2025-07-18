"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobMonitorService = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http")); // Import http module
const database_1 = __importDefault(require("../config/database")); // Adjust path as needed
// Import middleware
const loggerMiddleware_1 = require("./middleware/loggerMiddleware");
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const scraperRoutes_1 = __importDefault(require("./routes/scraperRoutes"));
const paginationRoutes_1 = __importDefault(require("./routes/paginationRoutes")); // Import pagination routes
const dataRoutes_1 = __importDefault(require("./routes/dataRoutes")); // Import data routes
const scheduleRoutes_1 = __importDefault(require("./routes/scheduleRoutes")); // Import schedule routes
// Import WebSocket and JobMonitor services
const WebSocketService_1 = require("./services/WebSocketService");
const JobMonitorService_1 = require("./services/JobMonitorService");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Create the data directory if it doesn't exist
const dataDir = path_1.default.join(__dirname, '..', 'data'); // Adjust path for src directory
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir);
}
// Security Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
// Body parser middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Request logging middleware
app.use(loggerMiddleware_1.requestLogger);
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api', scraperRoutes_1.default); // Scraper routes are nested under /api, not /api/projects/:id/scrapers
app.use('/api/pagination', paginationRoutes_1.default); // Use pagination routes
app.use('/api/data', dataRoutes_1.default); // Use data routes
app.use('/api', scheduleRoutes_1.default); // Use schedule routes
// Error handling middleware
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize WebSocket Service
const wsService = new WebSocketService_1.WebSocketService(server);
// Initialize Job Monitor Service
exports.jobMonitorService = JobMonitorService_1.JobMonitorService.getInstance(wsService);
const startServer = async () => {
    try {
        await database_1.default.authenticate();
        console.log('Database connection has been established successfully.');
        // Sync models with the database (create tables if they don't exist)
        // In a real application, you might use migrations instead of `sync({ force: true })`
        // `force: true` will drop existing tables and re-create them
        await database_1.default.sync();
        console.log('Database synchronized.');
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};
startServer();
