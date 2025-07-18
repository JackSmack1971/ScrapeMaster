"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PaginationDetector_1 = require("../PaginationDetector");
describe('PaginationDetector', () => {
    let detector;
    let mockPage;
    let mockElementHandle;
    beforeEach(() => {
        detector = new PaginationDetector_1.PaginationDetector();
        mockElementHandle = {
            boundingBox: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 10, height: 10 }), // Mock a visible element
            evaluate: jest.fn(), // Mock evaluate for textContent
            // Add other ElementHandle methods that might be called
        };
        mockPage = {
            $$: jest.fn().mockResolvedValue([mockElementHandle]),
            // Mock page.evaluate to simulate textContent retrieval
            evaluate: jest.fn((fn, element) => {
                // This mock assumes 'fn' is a function that accesses 'textContent'
                // and 'element' is the mocked ElementHandle.
                // It's a simplified mock, for more complex scenarios, consider a more robust solution.
                if (fn.toString().includes('el.textContent')) {
                    // Return a default text content for elements, can be overridden in specific tests
                    return Promise.resolve('Default Text Content');
                }
                return Promise.resolve(undefined);
            }),
            // Add other Page methods that might be called
        };
    });
    it('should detect numbered pagination when present', async () => {
        mockPage.$$.mockImplementation((selector) => {
            if (selector.includes('.pagination a') || selector.includes('a[href*="page="]') || selector.includes('.page-numbers')) {
                return Promise.resolve([mockElementHandle]);
            }
            return Promise.resolve([]);
        });
        mockElementHandle.evaluate.mockResolvedValue('1'); // Mock text content for numbered pagination
        const detectedPattern = await detector.detectPagination(mockPage);
        expect(detectedPattern).not.toBeNull();
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.type).toBe('numbered');
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.name).toContain('Numbered Pagination');
    });
    it('should detect next/prev pagination when present', async () => {
        mockPage.$$.mockImplementation((selector) => {
            if (selector.includes('a.next')) {
                return Promise.resolve([mockElementHandle]);
            }
            return Promise.resolve([]);
        });
        // The beforeEach mock for evaluate should handle this
        // No specific mock needed here unless it's different from default
        const detectedPattern = await detector.detectPagination(mockPage);
        expect(detectedPattern).not.toBeNull();
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.type).toBe('next-prev');
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.name).toContain('Next Button');
    });
    it('should return null if no pagination is detected', async () => {
        mockPage.$$.mockResolvedValue([]); // No elements found for any selector
        const detectedPattern = await detector.detectPagination(mockPage);
        expect(detectedPattern).toBeNull();
    });
    it('should prioritize patterns with higher confidence', async () => {
        mockPage.$$.mockImplementation((selector) => {
            if (selector.includes('.pagination a')) { // Higher confidence
                return Promise.resolve([mockElementHandle]);
            }
            if (selector.includes('a.next')) { // Lower confidence
                return Promise.resolve([mockElementHandle]);
            }
            return Promise.resolve([]);
        });
        // Mock page.evaluate to return specific text content for these cases
        mockPage.evaluate.mockImplementationOnce((fn, element) => {
            if (fn.toString().includes('el.textContent')) {
                return Promise.resolve('1'); // For numbered
            }
            return Promise.resolve(undefined);
        });
        mockPage.evaluate.mockImplementationOnce((fn, element) => {
            if (fn.toString().includes('el.textContent')) {
                return Promise.resolve('Next'); // For next
            }
            return Promise.resolve(undefined);
        });
        const detectedPattern = await detector.detectPagination(mockPage);
        expect(detectedPattern).not.toBeNull();
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.name).toContain('Numbered Pagination (Common)'); // Expect the higher confidence one
    });
    it('should add a custom pattern and prioritize it if confidence is higher', async () => {
        detector.addCustomPattern({
            name: 'Custom High Confidence Next',
            selector: '.custom-next-btn',
            type: 'next-prev',
            confidence: 0.99,
            textPattern: 'Go Next',
        });
        mockPage.$$.mockImplementation((selector) => {
            if (selector.includes('.custom-next-btn')) {
                return Promise.resolve([mockElementHandle]);
            }
            return Promise.resolve([]);
        });
        // Mock page.evaluate for this specific test
        mockPage.evaluate.mockImplementation((fn, element) => {
            if (fn.toString().includes('el.textContent')) {
                return Promise.resolve('Go Next');
            }
            return Promise.resolve(undefined);
        });
        const detectedPattern = await detector.detectPagination(mockPage);
        expect(detectedPattern).not.toBeNull();
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.name).toBe('Custom High Confidence Next');
    });
    it('should reduce confidence if text pattern does not match', async () => {
        // Temporarily modify commonPatterns to only include the relevant pattern for this test
        const originalCommonPatterns = detector['commonPatterns'];
        detector['commonPatterns'] = [
            { name: 'Next Button (Common)', selector: 'a.next', type: 'next-prev', confidence: 0.9, textPattern: 'next|»|›' },
        ];
        mockPage.$$.mockImplementation((selector) => {
            if (selector.includes('a.next')) {
                return Promise.resolve([mockElementHandle]);
            }
            return Promise.resolve([]);
        });
        // Mock page.evaluate to return the text content of the element
        mockPage.evaluate.mockImplementation((fn, element) => {
            if (fn.toString().includes('el.textContent')) {
                return Promise.resolve('Some Other Text'); // Text that will not match the pattern
            }
            return Promise.resolve(null);
        });
        const detectedPattern = await detector.detectPagination(mockPage);
        expect(detectedPattern).not.toBeNull();
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.name).toBe('Next Button (Common)');
        expect(detectedPattern === null || detectedPattern === void 0 ? void 0 : detectedPattern.confidence).toBeCloseTo(0.9 * 0.5); // Original confidence * 0.5
        // Restore original commonPatterns
        detector['commonPatterns'] = originalCommonPatterns;
    });
    // Add more tests for load-more, infinite-scroll, and edge cases
});
