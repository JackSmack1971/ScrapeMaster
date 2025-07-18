"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const bull_1 = __importDefault(require("bull"));
class QueueManager {
    constructor(queueName, redisUrl = 'redis://127.0.0.1:6379') {
        this.jobQueue = new bull_1.default(queueName, redisUrl, {
            defaultJobOptions: {
                attempts: 3, // Default attempts for a job
                backoff: {
                    type: 'exponential',
                    delay: 1000, // Initial delay of 1 second
                },
            },
        });
        this.jobQueue.on('completed', (job, result) => {
            console.log(`Job ${job.id} of type ${job.data.type} completed with result:`, result);
        });
        this.jobQueue.on('failed', (job, err) => {
            console.error(`Job ${job.id} of type ${job.data.type} failed with error:`, err.message);
            // TODO: Integrate with RetryHandler
        });
        this.jobQueue.on('error', (err) => {
            console.error('Queue error:', err);
        });
        this.jobQueue.on('active', (job) => {
            console.log(`Job ${job.id} of type ${job.data.type} is now active.`);
        });
        this.jobQueue.on('stalled', (job) => {
            console.warn(`Job ${job.id} of type ${job.data.type} has stalled.`);
        });
        console.log(`QueueManager initialized for queue: ${queueName}`);
    }
    /**
     * Adds a job to the queue.
     * @param jobType - The type of job (e.g., 'scrape', 'processData').
     * @param payload - The data associated with the job.
     * @param options - Optional Bull job options (e.g., priority, delay, jobId).
     * @returns The created job.
     */
    async addJob(jobType, payload, options) {
        const jobData = { type: jobType, payload };
        const job = await this.jobQueue.add(jobData, options);
        console.log(`Added job '${jobType}' with ID: ${job.id} to queue.`);
        return job;
    }
    /**
     * Processes jobs from the queue.
     * @param jobType - The type of job to process.
     * @param concurrency - The maximum number of jobs to process concurrently.
     * @param handler - The function to call for processing each job.
     */
    processJob(jobType, concurrency, handler) {
        this.jobQueue.process(jobType, concurrency, handler);
        console.log(`Processing jobs of type '${jobType}' with concurrency: ${concurrency}`);
    }
    /**
     * Sets the maximum number of concurrent jobs for a specific job type.
     * Note: Bull's concurrency is set at the processJob level. This method is more conceptual
     * for resource management. Actual enforcement is via the `concurrency` parameter in `processJob`.
     * @param jobType - The type of job.
     * @param limit - The maximum number of concurrent jobs.
     */
    setConcurrencyLimit(jobType, limit) {
        // In Bull, concurrency is managed by the `process` method.
        // This method can be used to inform how `processJob` should be called.
        console.log(`Concurrency limit for job type '${jobType}' set to ${limit}.`);
    }
    /**
     * Gets the current job counts in the queue.
     * @returns An object containing counts for waiting, active, completed, failed, and delayed jobs.
     */
    async getJobCounts() {
        return this.jobQueue.getJobCounts();
    }
    /**
     * Pauses the queue. New jobs can still be added but will not be processed.
     */
    async pause() {
        await this.jobQueue.pause();
        console.log('Queue paused.');
    }
    /**
     * Resumes the queue.
     */
    async resume() {
        await this.jobQueue.resume();
        console.log('Queue resumed.');
    }
    /**
     * Closes the queue connection.
     */
    async close() {
        await this.jobQueue.close();
        console.log('Queue connection closed.');
    }
    /**
     * Cleans jobs from the queue based on their status.
     * @param grace - The grace period in milliseconds. Jobs older than this will be removed.
     * @param status - The status of jobs to clean ('completed', 'failed', 'delayed', 'active', 'wait').
     * @param limit - The maximum number of jobs to clean.
     */
    async cleanQueue(grace, status, limit) {
        const cleanedJobs = await this.jobQueue.clean(grace, status, limit);
        console.log(`Cleaned ${cleanedJobs.length} jobs with status '${status}'.`);
        return cleanedJobs;
    }
    /**
     * Retrieves a job by its ID.
     * @param jobId - The ID of the job to retrieve.
     * @returns The job object or null if not found.
     */
    async getJob(jobId) {
        return this.jobQueue.getJob(jobId);
    }
}
exports.QueueManager = QueueManager;
