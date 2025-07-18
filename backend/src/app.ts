import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import http from 'http'; // Import http module
import sequelize from '../config/database'; // Adjust path as needed
import connectDB from '../config/mongoose'; // Import Mongoose connection

// Import middleware
import { requestLogger } from './middleware/loggerMiddleware';
import { notFound, errorHandler } from './middleware/errorMiddleware';

// Import routes
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import scraperRoutes from './routes/scraperRoutes';
import paginationRoutes from './routes/paginationRoutes'; // Import pagination routes
import dataRoutes from './routes/dataRoutes'; // Import data routes
import scheduleRoutes from './routes/scheduleRoutes'; // Import schedule routes
import exportRoutes from './routes/exportRoutes'; // Import export routes
import validationRoutes from './routes/validationRoutes'; // Import validation routes

// Import WebSocket and JobMonitor services
import { WebSocketService } from './services/WebSocketService';
import { JobMonitorService } from './services/JobMonitorService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create the data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data'); // Adjust path for src directory
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Security Middleware
app.use(helmet());
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use(requestLogger);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', scraperRoutes); // Scraper routes are nested under /api, not /api/projects/:id/scrapers
app.use('/api/pagination', paginationRoutes); // Use pagination routes
app.use('/api/data', dataRoutes); // Use data routes
app.use('/api', scheduleRoutes); // Use schedule routes
app.use('/api', exportRoutes); // Use export routes
app.use('/api', validationRoutes); // Use validation routes

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket Service
const wsService = new WebSocketService(server);

// Initialize Job Monitor Service
export const jobMonitorService = JobMonitorService.getInstance(wsService);

const startServer = async () => {
  try {
    // Connect to MongoDB using Mongoose
    await connectDB();
    console.log('MongoDB connected successfully.');

    // await sequelize.authenticate(); // Commented out for Mongoose integration
    console.log('Database connection has been established successfully.');

    // Sync models with the database (create tables if they don't exist)
    // In a real application, you might use migrations instead of `sync({ force: true })`
    // `force: true` will will drop existing tables and re-create them
    // await sequelize.sync(); // Commented out for Mongoose integration
    console.log('Database synchronized.');

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();