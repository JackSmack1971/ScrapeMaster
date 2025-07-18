"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobMonitorService = void 0;
const Job_1 = __importDefault(require("../../models/Job"));
const logger_1 = __importDefault(require("../utils/logger"));
class JobMonitorService {
    constructor(wsService) {
        this.jobMetrics = new Map();
        this.wsService = wsService;
        logger_1.default.info('JobMonitorService initialized.');
    }
    static getInstance(wsService) {
        if (!JobMonitorService.instance) {
            JobMonitorService.instance = new JobMonitorService(wsService);
        }
        return JobMonitorService.instance;
    }
    async recordJobStart(jobId, userId) {
        this.jobMetrics.set(jobId, {
            recordsProcessed: 0,
            pagesProcessed: 0,
            startTime: Date.now(),
            status: 'running',
            errorCount: 0,
        });
        await this.updateJobStatusInDb(jobId, 'running');
        this.wsService.broadcastToUser(userId, 'job:start', { jobId, status: 'running', timestamp: Date.now() });
        logger_1.default.info(`Job ${jobId} started for user ${userId}.`);
    }
    async recordProgress(jobId, userId, records, pages) {
        const metrics = this.jobMetrics.get(jobId);
        if (metrics) {
            metrics.recordsProcessed += records;
            metrics.pagesProcessed += pages;
            // Calculate progress percentage if total is known
            // For now, just send current counts
            this.wsService.broadcastToUser(userId, 'job:progress', {
                jobId,
                recordsProcessed: metrics.recordsProcessed,
                pagesProcessed: metrics.pagesProcessed,
                timestamp: Date.now(),
            });
            logger_1.default.debug(`Job ${jobId} progress: ${metrics.recordsProcessed} records, ${metrics.pagesProcessed} pages.`);
        }
    }
    async recordJobCompletion(jobId, userId, status) {
        const metrics = this.jobMetrics.get(jobId);
        if (metrics) {
            metrics.endTime = Date.now();
            metrics.status = status;
            await this.updateJobStatusInDb(jobId, status);
            this.wsService.broadcastToUser(userId, 'job:end', {
                jobId,
                status,
                metrics: {
                    ...metrics,
                    duration: metrics.endTime - metrics.startTime,
                },
                timestamp: Date.now(),
            });
            this.jobMetrics.delete(jobId); // Clean up
            logger_1.default.info(`Job ${jobId} ended with status: ${status} for user ${userId}.`);
        }
    }
    async recordError(jobId, userId, error) {
        const metrics = this.jobMetrics.get(jobId);
        if (metrics) {
            metrics.errorCount++;
            // Optionally, store error details or trigger specific alerts
            this.wsService.broadcastToUser(userId, 'job:error', {
                jobId,
                error,
                errorCount: metrics.errorCount,
                timestamp: Date.now(),
            });
            logger_1.default.error(`Job ${jobId} encountered error: ${error}. Total errors: ${metrics.errorCount}`);
        }
    }
    async updateJobStatusInDb(jobId, status) {
        try {
            const job = await Job_1.default.findByPk(jobId);
            if (job) {
                job.status = status;
                // Update other relevant fields if necessary
                // job.records_scraped = metrics.recordsProcessed;
                // job.pages_processed = metrics.pagesProcessed;
                // if (metrics.endTime) job.completed_at = new Date(metrics.endTime);
                // if (status === 'failed') job.error_message = 'Job failed'; // More specific error message needed
                await job.save();
                logger_1.default.debug(`Job ${jobId} status updated to ${status} in database.`);
            }
            else {
                logger_1.default.warn(`Job ${jobId} not found in database for status update.`);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to update job ${jobId} status in DB: ${error.message}`);
        }
    }
    getJobMetrics(jobId) {
        return this.jobMetrics.get(jobId);
    }
    // Placeholder for system health monitoring (CPU, Memory, etc.)
    getSystemHealth() {
        // In a real application, this would involve OS-level metrics collection
        return {
            cpuUsage: Math.random() * 100, // Dummy data
            memoryUsage: Math.random() * 100, // Dummy data
            diskUsage: Math.random() * 100, // Dummy data
            timestamp: Date.now(),
        };
    }
    broadcastSystemHealth(userId) {
        const healthData = this.getSystemHealth();
        if (userId) {
            this.wsService.broadcastToUser(userId, 'system:health', healthData);
        }
        else {
            this.wsService.broadcastToAll('system:health', healthData);
        }
    }
}
exports.JobMonitorService = JobMonitorService;
