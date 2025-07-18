"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const loggerMiddleware_1 = require("../middleware/loggerMiddleware");
const robots_parser_1 = __importDefault(require("robots-parser"));
const axios_1 = __importDefault(require("axios"));
class RateLimiter {
    constructor(options) {
        this.lastRequestTime = new Map(); // domain -> timestamp
        this.robotsParsers = new Map(); // domain -> RobotsParser instance
        this.options = {
            minDelay: 1000, // Default to 1 second
            userAgent: 'ScrapeMasterBot',
            ...options
        };
    }
    async enforceDelay(url) {
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
                loggerMiddleware_1.logger.info(`Robots.txt crawl delay for ${domain}: ${crawlDelay}s`);
            }
        }
        if (elapsed < delay) {
            const timeToWait = delay - elapsed;
            loggerMiddleware_1.logger.info(`Rate limiting: Waiting ${timeToWait}ms before requesting ${url}`);
            await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
        this.lastRequestTime.set(domain, Date.now());
    }
    async isAllowed(url) {
        const robots = await this.getRobotsParser(url);
        if (!robots) {
            loggerMiddleware_1.logger.warn(`Could not fetch robots.txt for ${new URL(url).hostname}. Proceeding without robots.txt compliance.`);
            return true; // If robots.txt cannot be fetched, assume allowed
        }
        const allowed = robots.isAllowed(url, this.options.userAgent);
        if (!allowed) {
            loggerMiddleware_1.logger.warn(`Robots.txt disallows ${this.options.userAgent} from accessing ${url}`);
        }
        return allowed;
    }
    async getRobotsParser(url) {
        const domain = new URL(url).hostname;
        if (this.robotsParsers.has(domain)) {
            return this.robotsParsers.get(domain);
        }
        const robotsTxtUrl = `http://${domain}/robots.txt`; // Assuming http for robots.txt
        try {
            loggerMiddleware_1.logger.info(`Fetching robots.txt from ${robotsTxtUrl}`);
            const response = await axios_1.default.get(robotsTxtUrl, { timeout: 5000 });
            const robotsTxtContent = response.data;
            const robots = (0, robots_parser_1.default)(robotsTxtUrl, robotsTxtContent);
            this.robotsParsers.set(domain, robots);
            loggerMiddleware_1.logger.info(`Successfully fetched and parsed robots.txt for ${domain}`);
            return robots;
        }
        catch (error) {
            loggerMiddleware_1.logger.error(`Failed to fetch robots.txt for ${domain}: ${error.message}`);
            return null;
        }
    }
    // This is a placeholder for a more complex backoff strategy
    async exponentialBackoff(attempt, maxAttempts, initialDelay = 1000) {
        if (attempt >= maxAttempts) {
            throw new Error(`Max retry attempts (${maxAttempts}) reached.`);
        }
        const delay = initialDelay * Math.pow(2, attempt);
        loggerMiddleware_1.logger.warn(`Exponential backoff: Waiting ${delay}ms before retry (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}
exports.rateLimiter = new RateLimiter();
