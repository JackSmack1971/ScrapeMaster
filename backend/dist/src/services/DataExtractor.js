"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataExtractor = void 0;
const cheerio = __importStar(require("cheerio"));
const loggerMiddleware_1 = require("../middleware/loggerMiddleware");
class DataExtractor {
    extractCss(html, selector) {
        const $ = cheerio.load(html);
        const results = [];
        $(selector).each((_index, element) => {
            results.push($(element).text().trim());
        });
        loggerMiddleware_1.logger.info(`Extracted data using CSS selector: ${selector}`);
        return results;
    }
    extractXPath(html, xpath) {
        const $ = cheerio.load(html);
        const results = [];
        // Cheerio does not natively support XPath.
        // For full XPath support, a separate library like 'xpath' or 'xmldom' would be needed.
        // For now, we'll log a warning and return an empty array.
        loggerMiddleware_1.logger.warn(`XPath extraction is not natively supported by Cheerio. For XPath: "${xpath}", consider using a dedicated XPath library.`);
        return results;
    }
    extractAttribute(html, selector, attribute) {
        const $ = cheerio.load(html);
        const results = [];
        $(selector).each((_index, element) => {
            const attrValue = $(element).attr(attribute);
            if (attrValue) {
                results.push(attrValue.trim());
            }
        });
        loggerMiddleware_1.logger.info(`Extracted attribute "${attribute}" using CSS selector: ${selector}`);
        return results;
    }
    extractText(html, selector) {
        const $ = cheerio.load(html);
        const results = [];
        $(selector).each((_index, element) => {
            results.push($(element).text().trim());
        });
        loggerMiddleware_1.logger.info(`Extracted text content using CSS selector: ${selector}`);
        return results;
    }
    // Handles nested elements by providing a base selector and then sub-selectors
    extractNested(html, baseSelector, nestedSelectors) {
        const $ = cheerio.load(html);
        const results = [];
        $(baseSelector).each((_index, baseElement) => {
            const nestedData = {};
            for (const key in nestedSelectors) {
                const selector = nestedSelectors[key];
                const elements = $(baseElement).find(selector);
                if (elements.length > 1) {
                    nestedData[key] = elements.map((_i, el) => $(el).text().trim()).get();
                }
                else if (elements.length === 1) {
                    nestedData[key] = elements.text().trim();
                }
                else {
                    nestedData[key] = ''; // Or null, depending on desired behavior for missing elements
                }
            }
            results.push(nestedData);
        });
        loggerMiddleware_1.logger.info(`Extracted nested data using base selector: ${baseSelector}`);
        return results;
    }
}
exports.dataExtractor = new DataExtractor();
