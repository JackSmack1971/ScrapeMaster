import Bull, { Job, Queue } from 'bull';
import { logger } from '../middleware/loggerMiddleware';
import { browserManager } from './BrowserManager';
import { scraperEngine } from './ScraperEngine';
import { dataExtractor } from './DataExtractor';
import { rateLimiter } from './RateLimiter';

interface ScrapeJobData {
    url: string;
    selector: string;
    type: 'css' | 'xpath' | 'attribute' | 'text' | 'nested';
    attribute?: string;
    nestedSelectors?: { [key: string]: string };
    screenshotPath?: string;
    executeScript?: string;
    pagination?: {
        maxPages?: number;
        manualSelector?: string;
        manualType?: 'numbered' | 'next-prev' | 'load-more' | 'infinite-scroll';
    };
}

class JobProcessor {
    private scrapeQueue: Queue<ScrapeJobData>;

    constructor() {
        // Connect to Redis for Bull queue. Assuming Redis is running locally.
        this.scrapeQueue = new Bull('scrapeQueue', {
            redis: {
                host: '127.0.0.1',
                port: 6379,
            }
        });

        this.setupQueueProcessors();
        this.setupQueueEventHandlers();
    }

    private setupQueueProcessors(): void {
        this.scrapeQueue.process(async (job: Job<ScrapeJobData>) => {
            const { url, selector, type, attribute, nestedSelectors, screenshotPath, executeScript, pagination } = job.data;
            logger.info(`Processing job ${job.id}: Scraping ${url} with selector ${selector}`);

            // Enforce rate limiting and robots.txt compliance
            await rateLimiter.enforceDelay(url);
            const isAllowed = await rateLimiter.isAllowed(url);
            if (!isAllowed) {
                throw new Error(`Scraping of ${url} disallowed by robots.txt`);
            }

            let htmlContents: string[] | null = null; // Changed to array
            try {
                // Use ScraperEngine to get HTML content, passing pagination options
                htmlContents = await scraperEngine.scrape({ url, screenshotPath, executeScript, pagination });
                if (!htmlContents || htmlContents.length === 0) {
                    throw new Error(`Failed to retrieve HTML content for ${url}`);
                }
            } catch (error: any) {
                logger.error(`Error in ScraperEngine for job ${job.id}: ${(error as Error).message}`);
                throw error; // Re-throw to trigger retry or failure
            }

            let allExtractedData: string[] | any[] = []; // Accumulate data from all pages

            for (const htmlContent of htmlContents) {
                // Extract data based on type for each page's content
                let extractedDataPage: string[] | any[] = [];
                try {
                    switch (type) {
                        case 'css':
                            extractedDataPage = dataExtractor.extractCss(htmlContent, selector);
                            break;
                        case 'xpath':
                            extractedDataPage = dataExtractor.extractXPath(htmlContent, selector);
                            break;
                        case 'attribute':
                            if (!attribute) throw new Error('Attribute is required for attribute extraction type.');
                            extractedDataPage = dataExtractor.extractAttribute(htmlContent, selector, attribute);
                            break;
                        case 'text':
                            extractedDataPage = dataExtractor.extractText(htmlContent, selector);
                            break;
                        case 'nested':
                            if (!nestedSelectors) throw new Error('Nested selectors are required for nested extraction type.');
                            extractedDataPage = dataExtractor.extractNested(htmlContent, selector, nestedSelectors);
                            break;
                        default:
                            throw new Error(`Unknown extraction type: ${type}`);
                    }
                    allExtractedData = allExtractedData.concat(extractedDataPage); // Concatenate data from current page
                } catch (error: any) {
                    logger.error(`Error in DataExtractor for job ${job.id} on one page: ${(error as Error).message}`);
                    // Continue processing other pages even if one fails
                }
            }

            logger.info(`Job ${job.id} completed. Extracted ${allExtractedData.length} items across all pages.`);
            return { extractedData: allExtractedData }; // Return all accumulated data
        });
    }

    private setupQueueEventHandlers(): void {
        this.scrapeQueue.on('global:completed', (jobId: number, result: any) => {
            logger.info(`Job ${jobId} completed with result: ${JSON.stringify(result)}`);
            // Here you might save the result to the database
        });

        this.scrapeQueue.on('global:failed', async (jobId: number, error: Error) => {
            logger.error(`Job ${jobId} failed with error: ${error.message}`);
            const job = await this.scrapeQueue.getJob(jobId);
            if (job) {
                const attemptsMade = job.attemptsMade;
                const maxAttempts = job.opts.attempts || 1; // Default attempts to 1 if not set
                logger.warn(`Job ${jobId} (attempts: ${attemptsMade}/${maxAttempts}) failed. Retrying...`);
                // Bull handles retries automatically based on job options
            }
        });

        this.scrapeQueue.on('global:progress', (jobId: number, progress: any) => {
            logger.info(`Job ${jobId} progress: ${progress}`);
        });

        this.scrapeQueue.on('global:active', (jobId: number) => {
            logger.info(`Job ${jobId} is now active.`);
        });

        this.scrapeQueue.on('global:stalled', (jobId: number) => {
            logger.warn(`Job ${jobId} stalled.`);
        });
    }

    public async addJob(jobData: ScrapeJobData): Promise<Job<ScrapeJobData>> {
        const job = await this.scrapeQueue.add(jobData, {
            attempts: 3, // Retry up to 3 times on failure
            backoff: {
                type: 'exponential',
                delay: 1000, // 1 second initial delay
            },
            removeOnComplete: true, // Remove job from queue when completed
            removeOnFail: false, // Keep failed jobs for inspection
        });
        logger.info(`Added job ${job.id} to scrape queue.`);
        return job;
    }

    public async closeQueue(): Promise<void> {
        await this.scrapeQueue.close();
        logger.info('Scrape queue closed.');
    }
}

export const jobProcessor = new JobProcessor();