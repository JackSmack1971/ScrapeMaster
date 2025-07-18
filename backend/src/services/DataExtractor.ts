import * as cheerio from 'cheerio';
import { logger } from '../middleware/loggerMiddleware';

class DataExtractor {
    public extractCss(html: string, selector: string): string[] {
        const $ = cheerio.load(html);
        const results: string[] = [];
        $(selector).each((_index, element) => {
            results.push($(element).text().trim());
        });
        logger.info(`Extracted data using CSS selector: ${selector}`);
        return results;
    }

    public extractXPath(html: string, xpath: string): string[] {
        const $ = cheerio.load(html);
        const results: string[] = [];
        // Cheerio does not natively support XPath.
        // For full XPath support, a separate library like 'xpath' or 'xmldom' would be needed.
        // For now, we'll log a warning and return an empty array.
        logger.warn(`XPath extraction is not natively supported by Cheerio. For XPath: "${xpath}", consider using a dedicated XPath library.`);
        return results;
    }

    public extractAttribute(html: string, selector: string, attribute: string): string[] {
        const $ = cheerio.load(html);
        const results: string[] = [];
        $(selector).each((_index, element) => {
            const attrValue = $(element).attr(attribute);
            if (attrValue) {
                results.push(attrValue.trim());
            }
        });
        logger.info(`Extracted attribute "${attribute}" using CSS selector: ${selector}`);
        return results;
    }

    public extractText(html: string, selector: string): string[] {
        const $ = cheerio.load(html);
        const results: string[] = [];
        $(selector).each((_index, element) => {
            results.push($(element).text().trim());
        });
        logger.info(`Extracted text content using CSS selector: ${selector}`);
        return results;
    }

    // Handles nested elements by providing a base selector and then sub-selectors
    public extractNested(html: string, baseSelector: string, nestedSelectors: { [key: string]: string }): any[] {
        const $ = cheerio.load(html);
        const results: any[] = [];

        $(baseSelector).each((_index, baseElement) => {
            const nestedData: { [key: string]: string | string[] } = {};
            for (const key in nestedSelectors) {
                const selector = nestedSelectors[key];
                const elements = $(baseElement).find(selector);
                if (elements.length > 1) {
                    nestedData[key] = elements.map((_i, el) => $(el).text().trim()).get();
                } else if (elements.length === 1) {
                    nestedData[key] = elements.text().trim();
                } else {
                    nestedData[key] = ''; // Or null, depending on desired behavior for missing elements
                }
            }
            results.push(nestedData);
        });
        logger.info(`Extracted nested data using base selector: ${baseSelector}`);
        return results;
    }
}

export const dataExtractor = new DataExtractor();