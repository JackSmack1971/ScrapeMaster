"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryHandler = void 0;
const QueueManager_1 = require("./QueueManager"); // Assuming QueueManager is in the same directory
var FailureReason;
(function (FailureReason) {
    FailureReason["NetworkError"] = "NetworkError";
    FailureReason["ScraperError"] = "ScraperError";
    FailureReason["TargetBlocked"] = "TargetBlocked";
    FailureReason["Unknown"] = "Unknown";
})(FailureReason || (FailureReason = {}));
class RetryHandler {
    constructor(deadLetterQueueName = 'dead-letter-queue', redisUrl) {
        this.defaultRetryOptions = {
            maxAttempts: 5,
            initialDelayMs: 1000, // 1 second
            maxDelayMs: 60000, // 1 minute
            factor: 2, // Exponential backoff factor
        };
        this.deadLetterQueue = new QueueManager_1.QueueManager(deadLetterQueueName, redisUrl);
        console.log(`RetryHandler initialized with dead letter queue: ${deadLetterQueueName}`);
    }
    /**
     * Classifies the reason for a job failure.
     * This is a simplified classification. In a real system, this would involve
     * more sophisticated error parsing and potentially AI/ML for pattern recognition.
     * @param error - The error object.
     * @returns The classified failure reason.
     */
    classifyFailureReason(error) {
        if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
            return FailureReason.NetworkError;
        }
        if (error.message.includes('scraper') || error.message.includes('parse')) {
            return FailureReason.ScraperError;
        }
        if (error.message.includes('blocked') || error.message.includes('captcha')) {
            return FailureReason.TargetBlocked;
        }
        return FailureReason.Unknown;
    }
    /**
     * Determines if a job should be retried and calculates the next delay.
     * @param job - The Bull job object.
     * @param error - The error that caused the failure.
     * @param options - Custom retry options for this job.
     * @returns The delay in milliseconds for the next retry, or -1 if no more retries.
     */
    calculateRetryDelay(job, error, options) {
        const currentAttempts = job.attemptsMade || 0;
        const retryOptions = { ...this.defaultRetryOptions, ...options };
        if (currentAttempts >= retryOptions.maxAttempts) {
            console.warn(`Job ${job.id} reached maximum retry attempts (${retryOptions.maxAttempts}). Moving to dead letter queue.`);
            this.moveToDeadLetterQueue(job, error);
            return -1; // No more retries
        }
        const delay = Math.min(retryOptions.initialDelayMs * Math.pow(retryOptions.factor, currentAttempts), retryOptions.maxDelayMs);
        console.log(`Job ${job.id} failed (attempt ${currentAttempts + 1}/${retryOptions.maxAttempts}). Retrying in ${delay}ms.`);
        return delay;
    }
    /**
     * Moves a failed job to the dead letter queue.
     * @param job - The failed Bull job.
     * @param error - The error associated with the failure.
     */
    async moveToDeadLetterQueue(job, error) {
        const failureReason = this.classifyFailureReason(error);
        await this.deadLetterQueue.addJob('dead-job', {
            originalJobId: job.id,
            originalJobType: job.data.type,
            originalJobPayload: job.data.payload,
            failureReason: failureReason,
            errorMessage: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        }, { attempts: 1 } // Do not retry jobs in the dead letter queue
        );
        // Optionally, remove the job from its original queue if Bull doesn't do it automatically after max attempts
        // This depends on how Bull's retry mechanism is configured.
    }
    /**
     * Processes jobs from the dead letter queue.
     * @param handler - The function to call for processing each dead letter job.
     */
    processDeadLetterJobs(handler) {
        this.deadLetterQueue.processJob('dead-job', 1, handler); // Process dead jobs one by one
    }
    /**
     * Manually retry a job that was previously moved to the dead letter queue.
     * @param deadJobId - The ID of the job in the dead letter queue.
     * @param originalQueueManager - The QueueManager instance of the original queue.
     * @param newOptions - Optional new job options for the retried job.
     * @returns True if the job was successfully re-added for retry, false otherwise.
     */
    async retryDeadLetterJob(deadJobId, originalQueueManager, newOptions) {
        const deadJob = await this.deadLetterQueue.getJob(deadJobId);
        if (!deadJob || deadJob.data.type !== 'dead-job') {
            console.warn(`Dead letter job with ID ${deadJobId} not found.`);
            return false;
        }
        const originalJobData = deadJob.data;
        await originalQueueManager.addJob(originalJobData.originalJobType, originalJobData.originalJobPayload, {
            attempts: 1, // Reset attempts for a manual retry
            ...newOptions,
        });
        // Optionally remove from dead letter queue after successful re-addition
        await this.deadLetterQueue.cleanQueue(0, 'completed', 1); // Clean the specific dead job
        console.log(`Dead letter job ${deadJobId} re-added to original queue for retry.`);
        return true;
    }
}
exports.RetryHandler = RetryHandler;
