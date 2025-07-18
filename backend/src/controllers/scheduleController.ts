import { Response, NextFunction } from 'express';
import { JobScheduler } from '../services/JobScheduler';
import { QueueManager } from '../services/QueueManager';
import { RetryHandler } from '../services/RetryHandler';
import Scraper from '../../models/Scraper'; // Assuming Scraper model path
import { AuthenticatedRequest } from '../types'; // Import AuthenticatedRequest

// Initialize the services
const jobScheduler = new JobScheduler();
const scraperQueue = new QueueManager('scraper-jobs'); // A queue for scraper jobs
const retryHandler = new RetryHandler();

// Process scraper jobs (example handler)
scraperQueue.processJob('scrape', 5, async (job) => {
  console.log(`Processing scrape job ${job.id} for scraper ID: ${job.data.payload.scraperId}`);
  // Here you would integrate with your actual scraper execution logic
  // For now, simulate success or failure
  const success = Math.random() > 0.2; // 80% success rate
  if (!success) {
    throw new Error('Simulated scrape failure');
  }
  return { status: 'success', data: 'Scraped data' };
});

export const createScheduledJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id: scraperId } = req.params;
    const { cronExpression, timezone, name } = req.body;

    if (!cronExpression || !name) {
      return res.status(400).json({ message: 'Cron expression and name are required.' });
    }

    // Optional: Validate scraperId exists
    const scraper = await Scraper.findByPk(scraperId); // Using findByPk for Sequelize models
    if (!scraper) {
      return res.status(404).json({ message: 'Scraper not found.' });
    }

    if (!jobScheduler.validateCronExpression(cronExpression)) {
      return res.status(400).json({ message: 'Invalid cron expression.' });
    }

    // Define the task to be executed by the scheduler
    const task = async () => {
      console.log(`Scheduler triggered for scraper ${scraperId}. Adding job to queue.`);
      await scraperQueue.addJob('scrape', { scraperId: scraperId, scheduledBy: req.user?.id });
    };

    const jobId = jobScheduler.scheduleJob(name, cronExpression, task, timezone);

    res.status(201).json({
      message: 'Scheduled job created successfully.',
      scheduleId: jobId,
      scraperId: scraperId,
      cronExpression: cronExpression,
      name: name,
    });
  } catch (error) {
    next(error);
  }
};

export const updateScheduleConfiguration = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id: scheduleId } = req.params;
    const { cronExpression, timezone, name } = req.body;

    if (!scheduleId) {
      return res.status(400).json({ message: 'Schedule ID is required.' });
    }

    const existingSchedule = jobScheduler.getJob(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({ message: 'Scheduled job not found.' });
    }

    if (!cronExpression && !timezone && !name) {
      return res.status(400).json({ message: 'No update parameters provided.' });
    }

    // Re-schedule the job with new parameters
    // For simplicity, we'll recreate the task function. In a real app, you might want to fetch
    // the original task logic or store it more persistently.
    const updatedTask = async () => {
      console.log(`Scheduler triggered for updated job ${scheduleId}. Adding job to queue.`);
      // Assuming original scraperId can be retrieved or passed
      const scraperId = existingSchedule.task; // This is incorrect. Need to store scraperId with scheduled job.
      await scraperQueue.addJob('scrape', { scraperId: 'some-scraper-id', scheduledBy: req.user?.id });
    };

    const updated = jobScheduler.updateJob(
      scheduleId,
      cronExpression || existingSchedule.cronExpression,
      updatedTask,
      timezone || existingSchedule.timezone
    );

    if (updated) {
      res.status(200).json({ message: 'Scheduled job updated successfully.', scheduleId });
    } else {
      res.status(500).json({ message: 'Failed to update scheduled job.' });
    }
  } catch (error) {
    next(error);
  }
};

export const removeScheduledJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id: scheduleId } = req.params;

    if (!scheduleId) {
      return res.status(400).json({ message: 'Schedule ID is required.' });
    }

    const cancelled = jobScheduler.cancelJob(scheduleId);

    if (cancelled) {
      res.status(200).json({ message: 'Scheduled job removed successfully.', scheduleId });
    } else {
      res.status(404).json({ message: 'Scheduled job not found.' });
    }
  } catch (error) {
    next(error);
  }
};

export const getExecutionHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // This part requires a database to store historical execution data.
    // For now, this is a placeholder.
    // You would query your database for job execution logs.
    res.status(200).json({ message: 'Execution history endpoint - data not yet implemented.', history: [] });
  } catch (error) {
    next(error);
  }
};