"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobProcessor = void 0;
const bull_1 = __importDefault(require("bull"));
const loggerMiddleware_1 = require("../middleware/loggerMiddleware");
const ScraperEngine_1 = require("./ScraperEngine");
const DataExtractor_1 = require("./DataExtractor");
const RateLimiter_1 = require("./RateLimiter");
class JobProcessor {
    constructor() {
        // Connect to Redis for Bull queue. Assuming Redis is running locally.
        this.scrapeQueue = new bull_1.default('scrapeQueue', {
            redis: {
                host: '127.0.0.1',
                port: 6379,
            }
        });
        this.setupQueueProcessors();
        this.setupQueueEventHandlers();
    }
    setupQueueProcessors() {
        this.scrapeQueue.process(async (job) => {
            const { url, selector, type, attribute, nestedSelectors, screenshotPath, executeScript, pagination } = job.data;
            loggerMiddleware_1.logger.info(`Processing job ${job.id}: Scraping ${url} with selector ${selector}`);
            // Enforce rate limiting and robots.txt compliance
            await RateLimiter_1.rateLimiter.enforceDelay(url);
            const isAllowed = await RateLimiter_1.rateLimiter.isAllowed(url);
            if (!isAllowed) {
                throw new Error(`Scraping of ${url} disallowed by robots.txt`);
            }
            let htmlContents = null; // Changed to array
            try {
                // Use ScraperEngine to get HTML content, passing pagination options
                htmlContents = await ScraperEngine_1.scraperEngine.scrape({ url, screenshotPath, executeScript, pagination });
                if (!htmlContents || htmlContents.length === 0) {
                    throw new Error(`Failed to retrieve HTML content for ${url}`);
                }
            }
            catch (error) {
                loggerMiddleware_1.logger.error(`Error in ScraperEngine for job ${job.id}: ${error.message}`);
                throw error; // Re-throw to trigger retry or failure
            }
            let allExtractedData = []; // Accumulate data from all pages
            for (const htmlContent of htmlContents) {
                // Extract data based on type for each page's content
                let extractedDataPage = [];
                try {
                    switch (type) {
                        case 'css':
                            extractedDataPage = DataExtractor_1.dataExtractor.extractCss(htmlContent, selector);
                            break;
                        case 'xpath':
                            extractedDataPage = DataExtractor_1.dataExtractor.extractXPath(htmlContent, selector);
                            break;
                        case 'attribute':
                            if (!attribute)
                                throw new Error('Attribute is required for attribute extraction type.');
                            extractedDataPage = DataExtractor_1.dataExtractor.extractAttribute(htmlContent, selector, attribute);
                            break;
                        case 'text':
                            extractedDataPage = DataExtractor_1.dataExtractor.extractText(htmlContent, selector);
                            break;
                        case 'nested':
                            if (!nestedSelectors)
                                throw new Error('Nested selectors are required for nested extraction type.');
                            extractedDataPage = DataExtractor_1.dataExtractor.extractNested(htmlContent, selector, nestedSelectors);
                            break;
                        default:
                            throw new Error(`Unknown extraction type: ${type}`);
                    }
                    allExtractedData = allExtractedData.concat(extractedDataPage); // Concatenate data from current page
                }
                catch (error) {
                    loggerMiddleware_1.logger.error(`Error in DataExtractor for job ${job.id} on one page: ${error.message}`);
                    // Continue processing other pages even if one fails
                }
            }
            loggerMiddleware_1.logger.info(`Job ${job.id} completed. Extracted ${allExtractedData.length} items across all pages.`);
            return { extractedData: allExtractedData }; // Return all accumulated data
        });
    }
    setupQueueEventHandlers() {
        this.scrapeQueue.on('global:completed', (jobId, result) => {
            loggerMiddleware_1.logger.info(`Job ${jobId} completed with result: ${JSON.stringify(result)}`);
            // Here you might save the result to the database
        });
        this.scrapeQueue.on('global:failed', async (jobId, error) => {
            loggerMiddleware_1.logger.error(`Job ${jobId} failed with error: ${error.message}`);
            const job = await this.scrapeQueue.getJob(jobId);
            if (job) {
                const attemptsMade = job.attemptsMade;
                const maxAttempts = job.opts.attempts || 1; // Default attempts to 1 if not set
                loggerMiddleware_1.logger.warn(`Job ${jobId} (attempts: ${attemptsMade}/${maxAttempts}) failed. Retrying...`);
                // Bull handles retries automatically based on job options
            }
        });
        this.scrapeQueue.on('global:progress', (jobId, progress) => {
            loggerMiddleware_1.logger.info(`Job ${jobId} progress: ${progress}`);
        });
        this.scrapeQueue.on('global:active', (jobId) => {
            loggerMiddleware_1.logger.info(`Job ${jobId} is now active.`);
        });
        this.scrapeQueue.on('global:stalled', (jobId) => {
            loggerMiddleware_1.logger.warn(`Job ${jobId} stalled.`);
        });
    }
    async addJob(jobData) {
        const job = await this.scrapeQueue.add(jobData, {
            attempts: 3, // Retry up to 3 times on failure
            backoff: {
                type: 'exponential',
                delay: 1000, // 1 second initial delay
            },
            removeOnComplete: true, // Remove job from queue when completed
            removeOnFail: false, // Keep failed jobs for inspection
        });
        loggerMiddleware_1.logger.info(`Added job ${job.id} to scrape queue.`);
        return job;
    }
    async closeQueue() {
        await this.scrapeQueue.close();
        loggerMiddleware_1.logger.info('Scrape queue closed.');
    }
}
exports.jobProcessor = new JobProcessor();
