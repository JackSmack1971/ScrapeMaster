import { Page } from 'puppeteer';

export class ScrollHandler {
    constructor() {
        // Constructor logic
    }

    async handleInfiniteScroll(page: Page, scrollAttempts: number = 5, scrollDelay: number = 2000): Promise<boolean> {
        let newContentLoaded = true;
        let attempts = 0;

        while (newContentLoaded && attempts < scrollAttempts) {
            const initialHeight = await page.evaluate('document.body.scrollHeight');
            console.log(`Initial scroll height: ${initialHeight}`);

            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            console.log('Scrolled to bottom of the page.');

            await new Promise(resolve => setTimeout(resolve, scrollDelay)); // Wait for content to load

            const newHeight = await page.evaluate('document.body.scrollHeight');
            console.log(`New scroll height: ${newHeight}`);

            if (newHeight === initialHeight) {
                newContentLoaded = false;
                console.log('No new content loaded. Stopping infinite scroll.');
            } else {
                attempts++;
                console.log(`New content loaded. Scroll attempt ${attempts} of ${scrollAttempts}.`);
            }
        }
        return attempts > 0; // Returns true if any new content was loaded
    }

    // Method to wait for content stabilization (e.g., after a scroll or page load)
    async waitForContentStabilization(page: Page, timeout: number = 5000): Promise<void> {
        let lastHeight = await page.evaluate('document.body.scrollHeight');
        let stable = false;
        const startTime = Date.now();

        while (!stable && (Date.now() - startTime < timeout)) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for a short period
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === lastHeight) {
                stable = true;
                console.log('Content stabilized.');
            } else {
                lastHeight = newHeight;
                console.log('Content still loading...');
            }
        }
        if (!stable) {
            console.warn('Content did not stabilize within the given timeout.');
        }
    }
}