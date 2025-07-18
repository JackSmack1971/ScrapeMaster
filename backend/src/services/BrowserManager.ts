import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../middleware/loggerMiddleware';

interface BrowserPoolOptions {
    maxBrowsers: number;
    headless: boolean;
    args: string[];
}

class BrowserManager {
    private browserPool: Browser[] = [];
    private options: BrowserPoolOptions;
    private initialized: boolean = false;

    constructor(options?: Partial<BrowserPoolOptions>) {
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

    public async initialize(): Promise<void> {
        if (this.initialized) {
            logger.warn('BrowserManager already initialized.');
            return;
        }
        logger.info(`Initializing BrowserManager with ${this.options.maxBrowsers} browsers (headless: ${this.options.headless}).`);
        for (let i = 0; i < this.options.maxBrowsers; i++) {
            await this.launchNewBrowser();
        }
        this.initialized = true;
        logger.info('BrowserManager initialized successfully.');
    }

    private async launchNewBrowser(): Promise<void> {
        try {
            const browser = await puppeteer.launch({
                headless: this.options.headless, // Use the boolean value directly
                args: this.options.args,
            });
            this.browserPool.push(browser);
            logger.info(`Launched new browser instance. Pool size: ${this.browserPool.length}`);
            
            browser.on('disconnected', () => {
                logger.warn('Browser disconnected. Attempting to re-launch...');
                this.browserPool = this.browserPool.filter(b => b !== browser);
                this.launchNewBrowser();
            });
        } catch (error: any) {
            logger.error(`Failed to launch browser: ${(error as Error).message}`);
        }
    }

    public async getBrowser(): Promise<Browser> {
        if (!this.initialized) {
            throw new Error('BrowserManager not initialized. Call initialize() first.');
        }
        // Simple round-robin for now, can be improved with a more sophisticated pool management
        const browser = this.browserPool.shift();
        if (browser) {
            this.browserPool.push(browser); // Put it back at the end
            return browser;
        } else {
            logger.warn('No available browsers in pool. Launching a new one dynamically.');
            await this.launchNewBrowser();
            return this.getBrowser(); // Retry after launching a new browser
        }
    }

    public async getPage(): Promise<{ browser: Browser, page: Page }> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        return { browser, page };
    }

    public async cleanup(): Promise<void> {
        logger.info('Cleaning up BrowserManager: Closing all browser instances.');
        for (const browser of this.browserPool) {
            try {
                await browser.close();
            } catch (error: any) {
                logger.error(`Error closing browser: ${(error as Error).message}`);
            }
        }
        this.browserPool = [];
        this.initialized = false;
        logger.info('BrowserManager cleanup complete.');
    }

    public getPoolSize(): number {
        return this.browserPool.length;
    }
}

export const browserManager = new BrowserManager();