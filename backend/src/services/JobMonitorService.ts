import { WebSocketService } from './WebSocketService';
import Job from '../../models/Job';
import { JobInstance } from '../types'; // Import the JobInstance interface
import logger from '../utils/logger';

interface JobMetrics {
  recordsProcessed: number;
  pagesProcessed: number;
  startTime: number;
  endTime?: number;
  status: string;
  errorCount: number;
  // Add more metrics as needed
}

export class JobMonitorService {
  private static instance: JobMonitorService;
  private jobMetrics: Map<string, JobMetrics> = new Map();
  private wsService: WebSocketService;

  private constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    logger.info('JobMonitorService initialized.');
  }

  public static getInstance(wsService: WebSocketService): JobMonitorService {
    if (!JobMonitorService.instance) {
      JobMonitorService.instance = new JobMonitorService(wsService);
    }
    return JobMonitorService.instance;
  }

  public async recordJobStart(jobId: string, userId: string) {
    this.jobMetrics.set(jobId, {
      recordsProcessed: 0,
      pagesProcessed: 0,
      startTime: Date.now(),
      status: 'running',
      errorCount: 0,
    });
    await this.updateJobStatusInDb(jobId, 'running');
    this.wsService.broadcastToUser(userId, 'job:start', { jobId, status: 'running', timestamp: Date.now() });
    logger.info(`Job ${jobId} started for user ${userId}.`);
  }

  public async recordProgress(jobId: string, userId: string, records: number, pages: number) {
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
      logger.debug(`Job ${jobId} progress: ${metrics.recordsProcessed} records, ${metrics.pagesProcessed} pages.`);
    }
  }

  public async recordJobCompletion(jobId: string, userId: string, status: 'completed' | 'failed' | 'cancelled') {
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
      logger.info(`Job ${jobId} ended with status: ${status} for user ${userId}.`);
    }
  }

  public async recordError(jobId: string, userId: string, error: string) {
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
      logger.error(`Job ${jobId} encountered error: ${error}. Total errors: ${metrics.errorCount}`);
    }
  }

  private async updateJobStatusInDb(jobId: string, status: string) {
    try {
      const job = await Job.findByPk(jobId) as JobInstance;
      if (job) {
        job.status = status;
        // Update other relevant fields if necessary
        // job.records_scraped = metrics.recordsProcessed;
        // job.pages_processed = metrics.pagesProcessed;
        // if (metrics.endTime) job.completed_at = new Date(metrics.endTime);
        // if (status === 'failed') job.error_message = 'Job failed'; // More specific error message needed
        await job.save();
        logger.debug(`Job ${jobId} status updated to ${status} in database.`);
      } else {
        logger.warn(`Job ${jobId} not found in database for status update.`);
      }
    } catch (error) {
      logger.error(`Failed to update job ${jobId} status in DB: ${(error as Error).message}`);
    }
  }

  public getJobMetrics(jobId: string): JobMetrics | undefined {
    return this.jobMetrics.get(jobId);
  }

  // Placeholder for system health monitoring (CPU, Memory, etc.)
  public getSystemHealth() {
    // In a real application, this would involve OS-level metrics collection
    return {
      cpuUsage: Math.random() * 100, // Dummy data
      memoryUsage: Math.random() * 100, // Dummy data
      diskUsage: Math.random() * 100, // Dummy data
      timestamp: Date.now(),
    };
  }

  public broadcastSystemHealth(userId?: string) {
    const healthData = this.getSystemHealth();
    if (userId) {
      this.wsService.broadcastToUser(userId, 'system:health', healthData);
    } else {
      this.wsService.broadcastToAll('system:health', healthData);
    }
  }
}