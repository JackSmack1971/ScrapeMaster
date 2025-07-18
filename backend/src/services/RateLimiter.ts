import { logger } from '../middleware/loggerMiddleware';
import RobotsParser from 'robots-parser';
import axios from 'axios';

interface RateLimiterOptions {
    minDelay: number; // Minimum delay between requests to the same domain in milliseconds
    userAgent: string;
}

class RateLimiter {
    private lastRequestTime: Map<string, number> = new Map(); // domain -> timestamp
    private robotsParsers: Map<string, any> = new Map(); // domain -> RobotsParser instance
    private options: RateLimiterOptions;

    constructor(options?: Partial<RateLimiterOptions>) {
        this.options = {
            minDelay: 1000, // Default to 1 second
            userAgent: 'ScrapeMasterBot',
            ...options
        };
    }

    public async enforceDelay(url: string): Promise<void> {
        const domain = new URL(url).hostname;
        const lastTime = this.lastRequestTime.get(domain) || 0;
        const now = Date.now();
        const elapsed = now - lastTime;

        let delay = this.options.minDelay;

        // Check robots.txt for crawl delay
        const robots = await this.getRobotsParser(url);
        if (robots) {
            const crawlDelay = robots.getCrawlDelay(this.options.userAgent);
            if (crawlDelay && crawlDelay > 0) {
                delay = Math.max(delay, crawlDelay * 1000); // Convert seconds to milliseconds
                logger.info(`Robots.txt crawl delay for ${domain}: ${crawlDelay}s`);
            }
        }

        if (elapsed < delay) {
            const timeToWait = delay - elapsed;
            logger.info(`Rate limiting: Waiting ${timeToWait}ms before requesting ${url}`);
            await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
        this.lastRequestTime.set(domain, Date.now());
    }

    public async isAllowed(url: string): Promise<boolean> {
        const robots = await this.getRobotsParser(url);
        if (!robots) {
            logger.warn(`Could not fetch robots.txt for ${new URL(url).hostname}. Proceeding without robots.txt compliance.`);
            return true; // If robots.txt cannot be fetched, assume allowed
        }
        const allowed = robots.isAllowed(url, this.options.userAgent);
        if (!allowed) {
            logger.warn(`Robots.txt disallows ${this.options.userAgent} from accessing ${url}`);
        }
        return allowed;
    }

    private async getRobotsParser(url: string): Promise<any | null> {
        const domain = new URL(url).hostname;
        if (this.robotsParsers.has(domain)) {
            return this.robotsParsers.get(domain)!;
        }

        const robotsTxtUrl = `http://${domain}/robots.txt`; // Assuming http for robots.txt
        try {
            logger.info(`Fetching robots.txt from ${robotsTxtUrl}`);
            const response = await axios.get(robotsTxtUrl, { timeout: 5000 });
            const robotsTxtContent = response.data;
            const robots = RobotsParser(robotsTxtUrl, robotsTxtContent);
            this.robotsParsers.set(domain, robots);
            logger.info(`Successfully fetched and parsed robots.txt for ${domain}`);
            return robots;
        } catch (error: any) {
            logger.error(`Failed to fetch robots.txt for ${domain}: ${(error as Error).message}`);
            return null;
        }
    }

    // This is a placeholder for a more complex backoff strategy
    public async exponentialBackoff(attempt: number, maxAttempts: number, initialDelay: number = 1000): Promise<void> {
        if (attempt >= maxAttempts) {
            throw new Error(`Max retry attempts (${maxAttempts}) reached.`);
        }
        const delay = initialDelay * Math.pow(2, attempt);
        logger.warn(`Exponential backoff: Waiting ${delay}ms before retry (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

export const rateLimiter = new RateLimiter();