"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserManager = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const loggerMiddleware_1 = require("../middleware/loggerMiddleware");
class BrowserManager {
    constructor(options) {
        this.browserPool = [];
        this.initialized = false;
        this.options = {
            maxBrowsers: 5,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            ...options
        };
    }
    async initialize() {
        if (this.initialized) {
            loggerMiddleware_1.logger.warn('BrowserManager already initialized.');
            return;
        }
        loggerMiddleware_1.logger.info(`Initializing BrowserManager with ${this.options.maxBrowsers} browsers (headless: ${this.options.headless}).`);
        for (let i = 0; i < this.options.maxBrowsers; i++) {
            await this.launchNewBrowser();
        }
        this.initialized = true;
        loggerMiddleware_1.logger.info('BrowserManager initialized successfully.');
    }
    async launchNewBrowser() {
        try {
            const browser = await puppeteer_1.default.launch({
                headless: this.options.headless, // Use the boolean value directly
                args: this.options.args,
            });
            this.browserPool.push(browser);
            loggerMiddleware_1.logger.info(`Launched new browser instance. Pool size: ${this.browserPool.length}`);
            browser.on('disconnected', () => {
                loggerMiddleware_1.logger.warn('Browser disconnected. Attempting to re-launch...');
                this.browserPool = this.browserPool.filter(b => b !== browser);
                this.launchNewBrowser();
            });
        }
        catch (error) {
            loggerMiddleware_1.logger.error(`Failed to launch browser: ${error.message}`);
        }
    }
    async getBrowser() {
        if (!this.initialized) {
            throw new Error('BrowserManager not initialized. Call initialize() first.');
        }
        // Simple round-robin for now, can be improved with a more sophisticated pool management
        const browser = this.browserPool.shift();
        if (browser) {
            this.browserPool.push(browser); // Put it back at the end
            return browser;
        }
        else {
            loggerMiddleware_1.logger.warn('No available browsers in pool. Launching a new one dynamically.');
            await this.launchNewBrowser();
            return this.getBrowser(); // Retry after launching a new browser
        }
    }
    async getPage() {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        return { browser, page };
    }
    async cleanup() {
        loggerMiddleware_1.logger.info('Cleaning up BrowserManager: Closing all browser instances.');
        for (const browser of this.browserPool) {
            try {
                await browser.close();
            }
            catch (error) {
                loggerMiddleware_1.logger.error(`Error closing browser: ${error.message}`);
            }
        }
        this.browserPool = [];
        this.initialized = false;
        loggerMiddleware_1.logger.info('BrowserManager cleanup complete.');
    }
    getPoolSize() {
        return this.browserPool.length;
    }
}
exports.browserManager = new BrowserManager();
