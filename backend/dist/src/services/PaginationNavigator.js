"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationNavigator = void 0;
class PaginationNavigator {
    constructor() {
        // Constructor logic
    }
    async navigateNext(page, paginationDetails) {
        const { selector, type } = paginationDetails;
        try {
            switch (type) {
                case 'numbered':
                case 'next-prev':
                case 'load-more':
                    const element = await page.$(selector);
                    if (element) {
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => console.log('Navigation timeout or no navigation occurred')),
                            element.click(),
                        ]);
                        console.log(`Clicked on element with selector: ${selector}`);
                        return true;
                    }
                    else {
                        console.log(`Element with selector ${selector} not found for type ${type}`);
                        return false;
                    }
                case 'infinite-scroll':
                    // This type will be handled by ScrollHandler, so just return false here
                    console.log('Infinite scroll navigation handled by ScrollHandler');
                    return false;
                default:
                    console.log(`Unknown pagination type: ${type}`);
                    return false;
            }
        }
        catch (error) {
            console.error(`Error navigating to next page: ${error}`);
            return false;
        }
    }
    // Placeholder for URL-based pagination handling
    async navigateToUrl(page, url) {
        try {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => console.log('Navigation timeout or no navigation occurred')),
                page.goto(url),
            ]);
            console.log(`Navigated to URL: ${url}`);
            return true;
        }
        catch (error) {
            console.error(`Error navigating to URL ${url}: ${error}`);
            return false;
        }
    }
}
exports.PaginationNavigator = PaginationNavigator;
