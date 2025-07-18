import Queue, { JobStatusClean } from 'bull';

interface JobData {
  type: string;
  payload: any;
  [key: string]: any;
}

export class QueueManager {
  private jobQueue: Queue.Queue;

  constructor(queueName: string, redisUrl: string = 'redis://127.0.0.1:6379') {
    this.jobQueue = new Queue(queueName, redisUrl, {
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
  public async addJob(jobType: string, payload: any, options?: Queue.JobOptions): Promise<Queue.Job<JobData>> {
    const jobData: JobData = { type: jobType, payload };
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
  public processJob(
    jobType: string,
    concurrency: number,
    handler: (job: Queue.Job<JobData>) => Promise<any>
  ): void {
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
  public setConcurrencyLimit(jobType: string, limit: number): void {
    // In Bull, concurrency is managed by the `process` method.
    // This method can be used to inform how `processJob` should be called.
    console.log(`Concurrency limit for job type '${jobType}' set to ${limit}.`);
  }

  /**
   * Gets the current job counts in the queue.
   * @returns An object containing counts for waiting, active, completed, failed, and delayed jobs.
   */
  public async getJobCounts(): Promise<Queue.JobCounts> {
    return this.jobQueue.getJobCounts();
  }

  /**
   * Pauses the queue. New jobs can still be added but will not be processed.
   */
  public async pause(): Promise<void> {
    await this.jobQueue.pause();
    console.log('Queue paused.');
  }

  /**
   * Resumes the queue.
   */
  public async resume(): Promise<void> {
    await this.jobQueue.resume();
    console.log('Queue resumed.');
  }

  /**
   * Closes the queue connection.
   */
  public async close(): Promise<void> {
    await this.jobQueue.close();
    console.log('Queue connection closed.');
  }

  /**
   * Cleans jobs from the queue based on their status.
   * @param grace - The grace period in milliseconds. Jobs older than this will be removed.
   * @param status - The status of jobs to clean ('completed', 'failed', 'delayed', 'active', 'wait').
   * @param limit - The maximum number of jobs to clean.
   */
  public async cleanQueue(grace: number, status: JobStatusClean, limit?: number): Promise<any[]> {
    const cleanedJobs = await this.jobQueue.clean(grace, status, limit);
    console.log(`Cleaned ${cleanedJobs.length} jobs with status '${status}'.`);
    return cleanedJobs;
  }

  /**
   * Retrieves a job by its ID.
   * @param jobId - The ID of the job to retrieve.
   * @returns The job object or null if not found.
   */
  public async getJob(jobId: Queue.JobId): Promise<Queue.Job<JobData> | null> {
    return this.jobQueue.getJob(jobId);
  }
}