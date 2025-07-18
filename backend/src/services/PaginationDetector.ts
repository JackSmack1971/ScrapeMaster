import { Page, ElementHandle } from 'puppeteer';
import { browserManager } from './BrowserManager';
import { CustomError } from '../middleware/errorMiddleware';

interface PaginationPattern {
    name: string;
    selector: string;
    type: 'numbered' | 'next-prev' | 'load-more' | 'infinite-scroll';
    confidence: number; // 0-1, higher is more confident
    textPattern?: string; // Regex string for text content
}

export class PaginationDetector {
    private commonPatterns: PaginationPattern[] = [
        // Numbered pagination
        { name: 'Numbered Pagination (Common)', selector: '.pagination a', type: 'numbered', confidence: 0.8 },
        { name: 'Numbered Pagination (Page links)', selector: 'a[href*="page="]', type: 'numbered', confidence: 0.75 },
        { name: 'Numbered Pagination (Numbers)', selector: '.page-numbers, .page-item', type: 'numbered', confidence: 0.7 },

        // Next/Previous navigation
        { name: 'Next Button (Common)', selector: 'a.next, .next-page, #nextPage, [rel="next"]', type: 'next-prev', confidence: 0.9, textPattern: 'next|»|›' },
        { name: 'Previous Button (Common)', selector: 'a.prev, .prev-page, #prevPage, [rel="prev"]', type: 'next-prev', confidence: 0.8, textPattern: 'prev|previous|«|‹' },
        { name: 'Next Button (Text)', selector: 'a, button', type: 'next-prev', confidence: 0.85, textPattern: 'next|continue' },

        // Load More button
        { name: 'Load More Button (Common)', selector: '.load-more, #loadMoreBtn, button.load-more', type: 'load-more', confidence: 0.9 },
        { name: 'Load More Button (Text)', selector: 'button, a', type: 'load-more', confidence: 0.8, textPattern: 'load more|show more' },

        // Infinite scroll (requires dynamic detection)
        { name: 'Infinite Scroll (Body Scroll)', selector: 'body', type: 'infinite-scroll', confidence: 0.7 }
    ];

    constructor() {
        // Constructor logic
    }

    async detectPagination(page: Page): Promise<PaginationPattern | null> {
        let bestMatch: PaginationPattern | null = null;
        let highestConfidence = 0;

        for (const pattern of this.commonPatterns) {
            try {
                const elements: ElementHandle<Element>[] = await page.$$(pattern.selector);

                if (elements.length > 0) {
                    let currentConfidence = pattern.confidence;

                    if (pattern.textPattern) {
                        const regex = new RegExp(pattern.textPattern, 'i');
                        let textMatchFound = false;
                        for (const element of elements) {
                            const textContent = await page.evaluate(el => el.textContent, element);
                            if (textContent && regex.test(textContent.trim())) {
                                textMatchFound = true;
                                break;
                            }
                        }
                        if (!textMatchFound) {
                            currentConfidence *= 0.5; // Reduce confidence if text pattern not found
                        }
                    }

                    // Further refine confidence based on element visibility and interactability
                    if (pattern.type !== 'infinite-scroll') { // Infinite scroll doesn't need to be immediately clickable
                        const visibleElements = await Promise.all(elements.map(async el => {
                            const boundingBox = await el.boundingBox();
                            return boundingBox !== null && boundingBox.width > 0 && boundingBox.height > 0;
                        }));
                        if (!visibleElements.some(v => v)) {
                            currentConfidence *= 0.3; // Significantly reduce if no elements are visible
                        }
                    }

                    if (currentConfidence > highestConfidence) {
                        highestConfidence = currentConfidence;
                        bestMatch = { ...pattern, confidence: currentConfidence }; // Create a new object with updated confidence
                    }
                }
            } catch (error) {
                // Log the error using the logger utility if available
                // logger.warn(`Error evaluating pattern ${pattern.name}: ${error}`);
            }
        }
        return bestMatch;
    }

    // Method to add or update custom patterns
    addCustomPattern(pattern: PaginationPattern) {
        // Validate pattern structure and regex if present
        if (pattern.textPattern) {
            try {
                new RegExp(pattern.textPattern);
            } catch (e) {
                console.error(`Invalid regex in custom pattern "${pattern.name}": ${e}`);
                return;
            }
        }
        const existingIndex = this.commonPatterns.findIndex(p => p.name === pattern.name);
        if (existingIndex > -1) {
            this.commonPatterns[existingIndex] = pattern;
        } else {
            this.commonPatterns.push(pattern);
        }
        // Sort patterns by confidence in descending order so higher confidence patterns are checked first
        this.commonPatterns.sort((a, b) => b.confidence - a.confidence);
    }
}

const detector = new PaginationDetector();

export async function detectPaginationPattern(url?: string, htmlContent?: string): Promise<PaginationPattern | null> {
    const { page } = await browserManager.getPage();
    try {
        if (url) {
            await page.goto(url, { waitUntil: 'networkidle2' });
        } else if (htmlContent) {
            await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
        } else {
            throw new CustomError('Either URL or HTML content must be provided for detection.', 400);
        }
        const detected = await detector.detectPagination(page);
        return detected;
    } finally {
        await page.close();
    }
}

export async function testPattern(url: string, pattern: PaginationPattern, pageLimit: number = 3): Promise<any[]> {
    const { page } = await browserManager.getPage();
    const results: any[] = [];
    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        for (let i = 0; i < pageLimit; i++) {
            const currentPageUrl = page.url();
            const currentPageContent = await page.content();
            results.push({ page: i + 1, url: currentPageUrl, contentPreview: currentPageContent.substring(0, 500) });

            if (pattern.type === 'numbered' || pattern.type === 'next-prev') {
                const nextButton = await page.$(pattern.selector);
                if (nextButton) {
                    await Promise.all([
                        nextButton.click(),
                        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(e => console.log('Navigation timeout or no navigation:', e))
                    ]);
                } else {
                    console.log(`No more elements found for pattern: ${pattern.name}`);
                    break;
                }
            } else if (pattern.type === 'load-more') {
                const loadMoreButton = await page.$(pattern.selector);
                if (loadMoreButton) {
                    await Promise.all([
                        loadMoreButton.click(),
                        page.waitForSelector(pattern.selector, { hidden: true, timeout: 5000 }).catch(() => console.log('Load more button did not hide or disappear, continuing...')), // Wait for button to disappear or new content to load
                        page.waitForFunction('document.readyState === "complete"').catch(() => console.log('Document not complete after load more, continuing...'))
                    ]);
                } else {
                    console.log(`No more elements found for pattern: ${pattern.name}`);
                    break;
                }
            } else if (pattern.type === 'infinite-scroll') {
                const initialHeight = await page.evaluate('document.body.scrollHeight');
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await page.waitForFunction(`document.body.scrollHeight > ${initialHeight}`, { timeout: 10000 }).catch(() => console.log('No new content loaded after scroll, breaking.'));
                const newHeight = await page.evaluate('document.body.scrollHeight');
                if (newHeight === initialHeight) {
                    console.log('Infinite scroll: No new content loaded after scroll.');
                    break;
                }
                // For infinite scroll, we might need to wait for new elements to appear instead of navigation
                await new Promise(resolve => setTimeout(resolve, 2000)); // Give some time for content to render
            }
        }
    } finally {
        await page.close();
    }
    return results;
}