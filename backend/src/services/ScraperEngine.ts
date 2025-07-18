import { Browser, Page } from 'puppeteer';
import { logger } from '../middleware/loggerMiddleware';
import { browserManager } from './BrowserManager';
import { PaginationDetector } from './PaginationDetector';
import { PaginationNavigator } from './PaginationNavigator';
import { ScrollHandler } from './ScrollHandler';

interface ScrapeOptions {
    url: string;
    waitForSelector?: string;
    waitForTimeout?: number;
    executeScript?: string;
    screenshotPath?: string;
    pagination?: {
        maxPages?: number;
        manualSelector?: string;
        manualType?: 'numbered' | 'next-prev' | 'load-more' | 'infinite-scroll';
    };
}

class ScraperEngine {
    private paginationDetector: PaginationDetector;
    private paginationNavigator: PaginationNavigator;
    private scrollHandler: ScrollHandler;

    constructor() {
        this.paginationDetector = new PaginationDetector();
        this.paginationNavigator = new PaginationNavigator();
        this.scrollHandler = new ScrollHandler();
    }

    public async scrape(options: ScrapeOptions): Promise<string[] | null> {
        let page: Page | null = null;
        let browser: Browser | null = null;
        const allContent: string[] = [];
        let currentPage = 1;
        const maxPages = options.pagination?.maxPages || 1;

        try {
            ({ browser, page } = await browserManager.getPage());
            logger.info(`Navigating to ${options.url}`);
            await page.goto(options.url, { waitUntil: 'networkidle2' });

            while (currentPage <= maxPages) {
                logger.info(`Scraping page ${currentPage}`);

                if (options.waitForSelector) {
                    logger.info(`Waiting for selector: ${options.waitForSelector}`);
                    await page.waitForSelector(options.waitForSelector);
                }

                if (options.waitForTimeout) {
                    logger.info(`Waiting for timeout: ${options.waitForTimeout}ms`);
                    await new Promise(resolve => setTimeout(resolve, options.waitForTimeout));
                }

                if (options.executeScript) {
                    logger.info('Executing custom JavaScript...');
                    await page.evaluate(options.executeScript);
                }

                if (options.screenshotPath) {
                    logger.info(`Capturing screenshot for page ${currentPage} to ${options.screenshotPath}`);
                    const screenshotBuffer = await page.screenshot({ fullPage: true });
                    const fs = require('fs').promises;
                    const screenshotPath = options.screenshotPath.endsWith('.png') ? options.screenshotPath : `${options.screenshotPath}_page${currentPage}.png`;
                    await fs.writeFile(screenshotPath, screenshotBuffer);
                }

                const content = await page.content();
                allContent.push(content);
                logger.info(`Successfully scraped content from ${options.url} (page ${currentPage})`);

                if (currentPage >= maxPages) {
                    break; // Reached max pages
                }

                let navigated = false;
                if (options.pagination?.manualSelector && options.pagination?.manualType) {
                    logger.info(`Attempting manual pagination with selector: ${options.pagination.manualSelector} and type: ${options.pagination.manualType}`);
                    if (options.pagination.manualType === 'infinite-scroll') {
                        navigated = await this.scrollHandler.handleInfiniteScroll(page);
                    } else {
                        navigated = await this.paginationNavigator.navigateNext(page, {
                            selector: options.pagination.manualSelector,
                            type: options.pagination.manualType
                        });
                    }
                } else {
                    logger.info('Attempting automatic pagination detection.');
                    const detectedPattern = await this.paginationDetector.detectPagination(page);
                    if (detectedPattern) {
                        logger.info(`Automatically detected pagination pattern: ${detectedPattern.name} (type: ${detectedPattern.type})`);
                        if (detectedPattern.type === 'infinite-scroll') {
                            navigated = await this.scrollHandler.handleInfiniteScroll(page);
                        } else {
                            navigated = await this.paginationNavigator.navigateNext(page, {
                                selector: detectedPattern.selector,
                                type: detectedPattern.type
                            });
                        }
                    } else {
                        logger.info('No automatic pagination pattern detected.');
                    }
                }

                if (!navigated) {
                    logger.info('Could not navigate to the next page. Ending pagination.');
                    break;
                }

                currentPage++;
            }
            return allContent;
        } catch (error: any) {
            logger.error(`Error scraping ${options.url}: ${(error as Error).message}`);
            return null;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    public async getElementContent(url: string, selector: string): Promise<string | null> {
        let page: Page | null = null;
        let browser: Browser | null = null;
        try {
            ({ browser, page } = await browserManager.getPage());
            await page.goto(url, { waitUntil: 'networkidle2' });
            const content = await page.$eval(selector, el => el.textContent);
            logger.info(`Extracted content for selector "${selector}" from ${url}`);
            return content;
        } catch (error: any) {
            logger.error(`Error getting element content for "${selector}" from ${url}: ${(error as Error).message}`);
            return null;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    public async getElementAttribute(url: string, selector: string, attribute: string): Promise<string | null> {
        let page: Page | null = null;
        let browser: Browser | null = null;
        try {
            ({ browser, page } = await browserManager.getPage());
            await page.goto(url, { waitUntil: 'networkidle2' });
            const attributeValue = await page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
            logger.info(`Extracted attribute "${attribute}" for selector "${selector}" from ${url}`);
            return attributeValue;
        } catch (error: any) {
            logger.error(`Error getting element attribute "${attribute}" for "${selector}" from ${url}: ${(error as Error).message}`);
            return null;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }
}

export const scraperEngine = new ScraperEngine();