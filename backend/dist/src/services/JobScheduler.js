"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobScheduler = void 0;
const cron_1 = require("cron");
const uuid_1 = require("uuid");
class JobScheduler {
    constructor() {
        this.scheduledJobs = new Map();
        // Initialize any necessary components or load existing schedules
    }
    /**
     * Schedules a new job based on a cron expression.
     * @param name - A descriptive name for the job.
     * @param cronExpression - The cron string (e.g., '0 0 * * *' for daily at midnight).
     * @param task - The asynchronous function to execute when the job runs.
     * @param timezone - Optional timezone for the cron expression (e.g., 'America/New_York').
     * @returns The ID of the scheduled job.
     */
    scheduleJob(name, cronExpression, task, timezone) {
        const id = (0, uuid_1.v4)();
        const job = new cron_1.CronJob(cronExpression, async () => {
            console.log(`Executing scheduled job: ${name} (${id})`);
            try {
                await task();
                console.log(`Scheduled job ${name} (${id}) completed successfully.`);
            }
            catch (error) {
                console.error(`Scheduled job ${name} (${id}) failed:`, error);
                // TODO: Integrate with RetryHandler
            }
        }, null, // onComplete
        true, // start
        timezone // timeZone
        );
        this.scheduledJobs.set(id, { id, name, cronExpression, timezone, task, job });
        console.log(`Job '${name}' scheduled with ID: ${id} (Cron: ${cronExpression}, Timezone: ${timezone || 'System Default'})`);
        return id;
    }
    /**
     * Updates an existing scheduled job.
     * @param id - The ID of the job to update.
     * @param newCronExpression - The new cron string.
     * @param newTask - The new asynchronous function to execute.
     * @param newTimezone - The new optional timezone.
     * @returns True if the job was updated, false otherwise.
     */
    updateJob(id, newCronExpression, newTask, newTimezone) {
        var _a;
        const existingJob = this.scheduledJobs.get(id);
        if (!existingJob) {
            console.warn(`Job with ID ${id} not found for update.`);
            return false;
        }
        (_a = existingJob.job) === null || _a === void 0 ? void 0 : _a.stop(); // Stop the old job
        this.scheduledJobs.delete(id); // Remove old entry
        const newJobId = this.scheduleJob(existingJob.name, // Keep the original name
        newCronExpression, newTask, newTimezone);
        // Replace the old ID with the new one if the ID changed (due to uuidv4 in scheduleJob)
        // For simplicity, we'll just update the existing entry with the new job object
        const updatedJob = this.scheduledJobs.get(newJobId);
        if (updatedJob) {
            this.scheduledJobs.set(id, { ...updatedJob, id: id }); // Re-associate with original ID
            this.scheduledJobs.delete(newJobId); // Remove the temporary new ID
            console.log(`Job '${existingJob.name}' (ID: ${id}) updated.`);
            return true;
        }
        return false;
    }
    /**
     * Cancels a scheduled job.
     * @param id - The ID of the job to cancel.
     * @returns True if the job was cancelled, false otherwise.
     */
    cancelJob(id) {
        var _a;
        const job = this.scheduledJobs.get(id);
        if (job) {
            (_a = job.job) === null || _a === void 0 ? void 0 : _a.stop();
            this.scheduledJobs.delete(id);
            console.log(`Job with ID ${id} cancelled.`);
            return true;
        }
        console.warn(`Job with ID ${id} not found for cancellation.`);
        return false;
    }
    /**
     * Gets details of a scheduled job.
     * @param id - The ID of the job.
     * @returns The scheduled job details or undefined if not found.
     */
    getJob(id) {
        return this.scheduledJobs.get(id);
    }
    /**
     * Lists all currently scheduled jobs.
     * @returns An array of scheduled job details.
     */
    listAllJobs() {
        return Array.from(this.scheduledJobs.values()).map(({ id, name, cronExpression, timezone }) => ({
            id,
            name,
            cronExpression,
            timezone,
        }));
    }
    /**
     * Validates a cron expression.
     * This is a basic validation. More robust validation might require a dedicated library or regex.
     * @param cronExpression - The cron string to validate.
     * @returns True if the expression is valid, false otherwise.
     */
    validateCronExpression(cronExpression) {
        // A very basic check for 5 or 6 parts, and no obvious invalid characters.
        // Real cron validation is complex and often requires a library.
        const parts = cronExpression.trim().split(/\s+/);
        if (parts.length < 5 || parts.length > 6) {
            return false;
        }
        // Further validation could involve regex or a cron parsing library
        return true;
    }
    /**
     * Detects potential schedule conflicts.
     * This is a placeholder. Real conflict detection is complex and depends on job execution times.
     * @param cronExpression - The cron expression to check for conflicts.
     * @param timezone - The timezone for the cron expression.
     * @returns True if a conflict is detected, false otherwise.
     */
    detectConflict(cronExpression, timezone) {
        // This is a highly complex problem. For a real system, you'd need to:
        // 1. Parse cron expressions into concrete future execution times.
        // 2. Compare these execution times across all scheduled jobs.
        // 3. Define what constitutes a "conflict" (e.g., overlapping execution windows, resource contention).
        // For now, it's a placeholder.
        console.warn(`Conflict detection is a placeholder and not fully implemented.`);
        return false;
    }
}
exports.JobScheduler = JobScheduler;
