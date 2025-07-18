"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperEngine = void 0;
const loggerMiddleware_1 = require("../middleware/loggerMiddleware");
const BrowserManager_1 = require("./BrowserManager");
const PaginationDetector_1 = require("./PaginationDetector");
const PaginationNavigator_1 = require("./PaginationNavigator");
const ScrollHandler_1 = require("./ScrollHandler");
class ScraperEngine {
    constructor() {
        this.paginationDetector = new PaginationDetector_1.PaginationDetector();
        this.paginationNavigator = new PaginationNavigator_1.PaginationNavigator();
        this.scrollHandler = new ScrollHandler_1.ScrollHandler();
    }
    async scrape(options) {
        var _a, _b, _c;
        let page = null;
        let browser = null;
        const allContent = [];
        let currentPage = 1;
        const maxPages = ((_a = options.pagination) === null || _a === void 0 ? void 0 : _a.maxPages) || 1;
        try {
            ({ browser, page } = await BrowserManager_1.browserManager.getPage());
            loggerMiddleware_1.logger.info(`Navigating to ${options.url}`);
            await page.goto(options.url, { waitUntil: 'networkidle2' });
            while (currentPage <= maxPages) {
                loggerMiddleware_1.logger.info(`Scraping page ${currentPage}`);
                if (options.waitForSelector) {
                    loggerMiddleware_1.logger.info(`Waiting for selector: ${options.waitForSelector}`);
                    await page.waitForSelector(options.waitForSelector);
                }
                if (options.waitForTimeout) {
                    loggerMiddleware_1.logger.info(`Waiting for timeout: ${options.waitForTimeout}ms`);
                    await new Promise(resolve => setTimeout(resolve, options.waitForTimeout));
                }
                if (options.executeScript) {
                    loggerMiddleware_1.logger.info('Executing custom JavaScript...');
                    await page.evaluate(options.executeScript);
                }
                if (options.screenshotPath) {
                    loggerMiddleware_1.logger.info(`Capturing screenshot for page ${currentPage} to ${options.screenshotPath}`);
                    const screenshotBuffer = await page.screenshot({ fullPage: true });
                    const fs = require('fs').promises;
                    const screenshotPath = options.screenshotPath.endsWith('.png') ? options.screenshotPath : `${options.screenshotPath}_page${currentPage}.png`;
                    await fs.writeFile(screenshotPath, screenshotBuffer);
                }
                const content = await page.content();
                allContent.push(content);
                loggerMiddleware_1.logger.info(`Successfully scraped content from ${options.url} (page ${currentPage})`);
                if (currentPage >= maxPages) {
                    break; // Reached max pages
                }
                let navigated = false;
                if (((_b = options.pagination) === null || _b === void 0 ? void 0 : _b.manualSelector) && ((_c = options.pagination) === null || _c === void 0 ? void 0 : _c.manualType)) {
                    loggerMiddleware_1.logger.info(`Attempting manual pagination with selector: ${options.pagination.manualSelector} and type: ${options.pagination.manualType}`);
                    if (options.pagination.manualType === 'infinite-scroll') {
                        navigated = await this.scrollHandler.handleInfiniteScroll(page);
                    }
                    else {
                        navigated = await this.paginationNavigator.navigateNext(page, {
                            selector: options.pagination.manualSelector,
                            type: options.pagination.manualType
                        });
                    }
                }
                else {
                    loggerMiddleware_1.logger.info('Attempting automatic pagination detection.');
                    const detectedPattern = await this.paginationDetector.detectPagination(page);
                    if (detectedPattern) {
                        loggerMiddleware_1.logger.info(`Automatically detected pagination pattern: ${detectedPattern.name} (type: ${detectedPattern.type})`);
                        if (detectedPattern.type === 'infinite-scroll') {
                            navigated = await this.scrollHandler.handleInfiniteScroll(page);
                        }
                        else {
                            navigated = await this.paginationNavigator.navigateNext(page, {
                                selector: detectedPattern.selector,
                                type: detectedPattern.type
                            });
                        }
                    }
                    else {
                        loggerMiddleware_1.logger.info('No automatic pagination pattern detected.');
                    }
                }
                if (!navigated) {
                    loggerMiddleware_1.logger.info('Could not navigate to the next page. Ending pagination.');
                    break;
                }
                currentPage++;
            }
            return allContent;
        }
        catch (error) {
            loggerMiddleware_1.logger.error(`Error scraping ${options.url}: ${error.message}`);
            return null;
        }
        finally {
            if (page) {
                await page.close();
            }
        }
    }
    async getElementContent(url, selector) {
        let page = null;
        let browser = null;
        try {
            ({ browser, page } = await BrowserManager_1.browserManager.getPage());
            await page.goto(url, { waitUntil: 'networkidle2' });
            const content = await page.$eval(selector, el => el.textContent);
            loggerMiddleware_1.logger.info(`Extracted content for selector "${selector}" from ${url}`);
            return content;
        }
        catch (error) {
            loggerMiddleware_1.logger.error(`Error getting element content for "${selector}" from ${url}: ${error.message}`);
            return null;
        }
        finally {
            if (page) {
                await page.close();
            }
        }
    }
    async getElementAttribute(url, selector, attribute) {
        let page = null;
        let browser = null;
        try {
            ({ browser, page } = await BrowserManager_1.browserManager.getPage());
            await page.goto(url, { waitUntil: 'networkidle2' });
            const attributeValue = await page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
            loggerMiddleware_1.logger.info(`Extracted attribute "${attribute}" for selector "${selector}" from ${url}`);
            return attributeValue;
        }
        catch (error) {
            loggerMiddleware_1.logger.error(`Error getting element attribute "${attribute}" for "${selector}" from ${url}: ${error.message}`);
            return null;
        }
        finally {
            if (page) {
                await page.close();
            }
        }
    }
}
exports.scraperEngine = new ScraperEngine();
