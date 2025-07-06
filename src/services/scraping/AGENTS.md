# Web Scraping Engine Development Guide

## Core Scraping Architecture

### Service Structure
```
/src/services/scraping/
  /core/
    ScrapingEngine.ts        # Main orchestration service
    BrowserManager.ts        # Puppeteer browser lifecycle
    PageHandler.ts           # Page navigation and interaction
    DataExtractor.ts         # CSS selector data extraction
  /pagination/
    PaginationDetector.ts    # Auto-detect pagination patterns
    PaginationHandler.ts     # Navigate through pages
    InfiniteScrollHandler.ts # Handle infinite scroll
  /validation/
    ScraperValidator.ts      # Configuration validation
    DataValidator.ts         # Extracted data validation
    RobotsTxtChecker.ts      # Robots.txt compliance
  /utils/
    SelectorUtils.ts         # CSS/XPath utilities
    NetworkUtils.ts          # Request management
    ErrorHandler.ts          # Scraping-specific errors
```

### ScrapingEngine Implementation
```typescript
import puppeteer, { Browser, Page } from 'puppeteer';
import { ScraperConfig, ScrapingResult, ScrapingJob } from '../../types';

export class ScrapingEngine {
  private browser: Browser | null = null;
  private rateLimiter: RateLimiter;
  private robotsChecker: RobotsTxtChecker;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.robotsChecker = new RobotsTxtChecker();
  }

  async executeScraping(job: ScrapingJob): Promise<ScrapingResult> {
    const { config, options } = job;
    
    try {
      // Validate configuration before starting
      await this.validateConfig(config);
      
      // Check robots.txt compliance
      await this.robotsChecker.checkCompliance(config.url);
      
      // Initialize browser if needed
      await this.ensureBrowserReady();
      
      // Create new page with appropriate settings
      const page = await this.createConfiguredPage(config);
      
      // Execute main scraping workflow
      const result = await this.performScraping(page, config, options);
      
      return result;
      
    } catch (error) {
      throw new ScrapingError(
        `Scraping failed: ${error.message}`,
        'SCRAPING_EXECUTION_ERROR',
        { originalError: error, config, options }
      );
    }
  }

  private async performScraping(
    page: Page, 
    config: ScraperConfig, 
    options: ScrapingOptions
  ): Promise<ScrapingResult> {
    const results: ExtractedData[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages && currentPage <= (options.maxPages || 100)) {
      // Navigate to page or load more content
      if (currentPage === 1) {
        await this.navigateToPage(page, config.url, config.waitConditions);
      } else {
        hasMorePages = await this.handlePagination(page, config.paginationConfig);
        if (!hasMorePages) break;
      }

      // Extract data from current page
      const pageData = await this.extractPageData(page, config.selectors);
      results.push(...pageData);

      // Respect rate limiting
      await this.rateLimiter.delay(config.rateLimit || 1000);
      
      currentPage++;
    }

    return {
      data: results,
      pagesProcessed: currentPage - 1,
      totalRecords: results.length,
      completedAt: new Date()
    };
  }
}
```

## Critical Scraping Guidelines

### Browser Management Best Practices
```typescript
class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private pagePool: Page[] = [];
  private maxPages = 5;

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-gpu',
          '--window-size=1920,1080'
        ],
        defaultViewport: { width: 1920, height: 1080 }
      });
    }
    return this.browser;
  }

  async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Configure page settings
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);
    
    // Block unnecessary resources for performance
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    return page;
  }
}
```

### Data Extraction Patterns
```typescript
class DataExtractor {
  async extractData(page: Page, selectors: SelectorConfig): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];

    // Wait for content to load
    await this.waitForContent(page, selectors.waitSelector);

    // Extract data using multiple selector strategies
    for (const [fieldName, selector] of Object.entries(selectors.fields)) {
      try {
        const data = await this.extractField(page, fieldName, selector);
        results.push(data);
      } catch (error) {
        console.warn(`Failed to extract field ${fieldName}:`, error.message);
        // Continue with other fields
      }
    }

    return results;
  }

  private async extractField(
    page: Page, 
    fieldName: string, 
    selector: FieldSelector
  ): Promise<ExtractedData> {
    // Primary extraction attempt
    try {
      return await this.extractWithStrategy(page, selector.primary);
    } catch (primaryError) {
      // Fallback to alternative selectors
      if (selector.fallback) {
        try {
          return await this.extractWithStrategy(page, selector.fallback);
        } catch (fallbackError) {
          throw new Error(`All extraction strategies failed for ${fieldName}`);
        }
      }
      throw primaryError;
    }
  }

  private async extractWithStrategy(
    page: Page, 
    strategy: ExtractionStrategy
  ): Promise<ExtractedData> {
    switch (strategy.type) {
      case 'css':
        return await this.extractWithCSS(page, strategy);
      case 'xpath':
        return await this.extractWithXPath(page, strategy);
      case 'javascript':
        return await this.extractWithJS(page, strategy);
      default:
        throw new Error(`Unknown extraction strategy: ${strategy.type}`);
    }
  }
}
```

## Pagination Handling

### Pagination Detection Algorithm
```typescript
class PaginationDetector {
  async detectPaginationType(page: Page): Promise<PaginationType> {
    const paginationIndicators = await page.evaluate(() => {
      // Look for common pagination patterns
      const indicators = {
        numbered: document.querySelectorAll('a[href*="page"], .pagination, .page-numbers').length > 0,
        nextButton: document.querySelectorAll('a:contains("Next"), button:contains("Next"), .next').length > 0,
        loadMore: document.querySelectorAll('button:contains("Load"), .load-more, [data-load]').length > 0,
        infiniteScroll: document.querySelector('[data-infinite], .infinite-scroll') !== null
      };
      
      return indicators;
    });

    // Determine primary pagination type
    if (paginationIndicators.infiniteScroll) return 'infinite-scroll';
    if (paginationIndicators.loadMore) return 'load-more';
    if (paginationIndicators.numbered) return 'numbered';
    if (paginationIndicators.nextButton) return 'next-button';
    
    return 'none';
  }

  async findPaginationElements(page: Page, type: PaginationType): Promise<PaginationElements> {
    switch (type) {
      case 'numbered':
        return await this.findNumberedElements(page);
      case 'infinite-scroll':
        return await this.findScrollElements(page);
      case 'load-more':
        return await this.findLoadMoreElements(page);
      default:
        throw new Error(`Unsupported pagination type: ${type}`);
    }
  }
}
```

### Robust Pagination Navigation
```typescript
class PaginationHandler {
  async navigateToNextPage(
    page: Page, 
    paginationConfig: PaginationConfig
  ): Promise<boolean> {
    switch (paginationConfig.type) {
      case 'numbered':
        return await this.handleNumberedPagination(page, paginationConfig);
      case 'infinite-scroll':
        return await this.handleInfiniteScroll(page, paginationConfig);
      case 'load-more':
        return await this.handleLoadMore(page, paginationConfig);
      default:
        return false;
    }
  }

  private async handleInfiniteScroll(
    page: Page, 
    config: PaginationConfig
  ): Promise<boolean> {
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);
    
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for new content to load
    try {
      await page.waitForFunction(
        (height) => document.body.scrollHeight > height,
        { timeout: config.timeout || 10000 },
        initialHeight
      );
      
      // Additional wait for content stabilization
      await page.waitForTimeout(2000);
      return true;
      
    } catch (timeoutError) {
      // No more content loaded
      return false;
    }
  }

  private async handleLoadMore(
    page: Page, 
    config: PaginationConfig
  ): Promise<boolean> {
    const loadMoreSelector = config.loadMoreSelector || 
      'button:contains("Load"), .load-more, [data-load]';
    
    try {
      const loadMoreButton = await page.waitForSelector(loadMoreSelector, {
        timeout: 5000,
        visible: true
      });
      
      if (loadMoreButton) {
        await loadMoreButton.click();
        
        // Wait for new content
        await page.waitForTimeout(3000);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
}
```

## Error Handling and Recovery

### Scraping-Specific Error Types
```typescript
export class ScrapingError extends Error {
  constructor(
    message: string,
    public code: ScrapingErrorCode,
    public context?: any
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export type ScrapingErrorCode =
  | 'INVALID_URL'
  | 'SELECTOR_NOT_FOUND'
  | 'PAGE_LOAD_TIMEOUT'
  | 'JAVASCRIPT_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ROBOTS_TXT_BLOCKED'
  | 'NETWORK_ERROR'
  | 'BROWSER_CRASH'
  | 'PAGINATION_FAILED'
  | 'DATA_VALIDATION_ERROR';

class ErrorRecoveryHandler {
  async handleScrapingError(error: ScrapingError, context: ScrapingContext): Promise<RecoveryAction> {
    switch (error.code) {
      case 'PAGE_LOAD_TIMEOUT':
        return this.retryWithLongerTimeout(context);
      case 'SELECTOR_NOT_FOUND':
        return this.suggestAlternativeSelectors(context);
      case 'JAVASCRIPT_ERROR':
        return this.fallbackToStaticScraping(context);
      case 'RATE_LIMIT_EXCEEDED':
        return this.implementBackoffStrategy(context);
      case 'BROWSER_CRASH':
        return this.restartBrowserInstance(context);
      default:
        return this.logAndContinue(error, context);
    }
  }
}
```

## Performance Optimization

### Memory Management
```typescript
class MemoryManager {
  private memoryThreshold = 512 * 1024 * 1024; // 512MB
  private pageCount = 0;
  private maxPagesBeforeRestart = 100;

  async checkMemoryUsage(): Promise<boolean> {
    const usage = process.memoryUsage();
    return usage.heapUsed < this.memoryThreshold;
  }

  async shouldRestartBrowser(): Promise<boolean> {
    this.pageCount++;
    
    if (this.pageCount >= this.maxPagesBeforeRestart) {
      return true;
    }
    
    return !(await this.checkMemoryUsage());
  }

  async performGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
    }
  }
}
```

### Request Optimization
```typescript
class RequestOptimizer {
  setupPageOptimization(page: Page): void {
    // Block unnecessary resources
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      // Block images, fonts, and media for faster loading
      if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
        request.abort();
        return;
      }
      
      // Block analytics and tracking
      if (this.isTrackingRequest(url)) {
        request.abort();
        return;
      }
      
      request.continue();
    });

    // Set response compression
    page.setExtraHTTPHeaders({
      'Accept-Encoding': 'gzip, deflate, br'
    });
  }

  private isTrackingRequest(url: string): boolean {
    const trackingDomains = [
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.com/tr',
      'doubleclick.net'
    ];
    
    return trackingDomains.some(domain => url.includes(domain));
  }
}
```

## Security and Compliance

### Robots.txt Compliance
```typescript
class RobotsTxtChecker {
  private cache = new Map<string, RobotsInfo>();

  async checkCompliance(url: string): Promise<boolean> {
    const domain = new URL(url).origin;
    
    if (!this.cache.has(domain)) {
      const robotsInfo = await this.fetchRobotsInfo(domain);
      this.cache.set(domain, robotsInfo);
    }

    const robots = this.cache.get(domain)!;
    return this.isPathAllowed(url, robots);
  }

  private async fetchRobotsInfo(domain: string): Promise<RobotsInfo> {
    try {
      const response = await fetch(`${domain}/robots.txt`);
      const content = await response.text();
      return this.parseRobotsTxt(content);
    } catch (error) {
      // If robots.txt is not accessible, assume scraping is allowed
      return { allowed: true, crawlDelay: 1000 };
    }
  }

  private parseRobotsTxt(content: string): RobotsInfo {
    const lines = content.split('\n');
    let userAgentMatch = false;
    const disallowed: string[] = [];
    let crawlDelay = 1000;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim();
        userAgentMatch = agent === '*' || agent.includes('scrapermaster');
      }
      
      if (userAgentMatch && trimmed.startsWith('disallow:')) {
        const path = trimmed.split(':')[1].trim();
        if (path) disallowed.push(path);
      }
      
      if (userAgentMatch && trimmed.startsWith('crawl-delay:')) {
        crawlDelay = parseInt(trimmed.split(':')[1].trim()) * 1000;
      }
    }

    return { disallowed, crawlDelay, allowed: true };
  }
}
```

### Rate Limiting Implementation
```typescript
class RateLimiter {
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly windowSize = 60000; // 1 minute
  private readonly maxRequestsPerWindow = 60;

  async delay(minimumDelay: number = 1000): Promise<void> {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.windowSize) {
      this.windowStart = now;
      this.requestCount = 0;
    }
    
    // Check rate limit
    if (this.requestCount >= this.maxRequestsPerWindow) {
      const waitTime = this.windowSize - (now - this.windowStart);
      await this.sleep(waitTime);
      this.windowStart = Date.now();
      this.requestCount = 0;
    }
    
    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < minimumDelay) {
      await this.sleep(minimumDelay - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Testing Scraping Components

### Unit Testing Template
```typescript
describe('ScrapingEngine', () => {
  let scrapingEngine: ScrapingEngine;
  let mockPage: jest.Mocked<Page>;
  let mockBrowser: jest.Mocked<Browser>;

  beforeEach(() => {
    scrapingEngine = new ScrapingEngine();
    mockPage = createMockPage();
    mockBrowser = createMockBrowser();
  });

  afterEach(async () => {
    await scrapingEngine.cleanup();
  });

  describe('executeScraping', () => {
    it('should successfully scrape data with valid configuration', async () => {
      // Arrange
      const config = createValidScraperConfig();
      const job = { config, options: { maxPages: 1 } };
      
      mockPage.goto.mockResolvedValue(null as any);
      mockPage.evaluate.mockResolvedValue([
        { title: 'Test Article', url: 'https://example.com/1' }
      ]);

      // Act
      const result = await scrapingEngine.executeScraping(job);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        title: 'Test Article',
        url: 'https://example.com/1'
      });
      expect(result.pagesProcessed).toBe(1);
    });

    it('should handle JavaScript rendering timeout gracefully', async () => {
      // Arrange
      const config = createJSHeavyScraperConfig();
      const job = { config, options: { maxPages: 1 } };
      
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      // Act & Assert
      await expect(scrapingEngine.executeScraping(job))
        .rejects
        .toThrow('Navigation timeout');
    });

    it('should respect rate limiting between requests', async () => {
      // Arrange
      const config = createScraperConfig({ rateLimit: 1000 });
      const job = { config, options: { maxPages: 2 } };
      
      const startTime = Date.now();
      
      // Act
      await scrapingEngine.executeScraping(job);
      
      // Assert
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(1000); // At least 1 second delay
    });
  });
});
```

### Integration Testing with Real Sites
```typescript
describe('ScrapingEngine Integration', () => {
  let engine: ScrapingEngine;

  beforeAll(async () => {
    engine = new ScrapingEngine();
  });

  afterAll(async () => {
    await engine.cleanup();
  });

  it('should scrape static HTML content successfully', async () => {
    const config = {
      url: 'https://httpbin.org/html',
      selectors: {
        fields: {
          title: { primary: { type: 'css', selector: 'h1' } }
        }
      }
    };

    const result = await engine.executeScraping({
      config,
      options: { maxPages: 1 }
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBeTruthy();
  });

  it('should handle JavaScript-rendered content', async () => {
    // Test with a known SPA endpoint
    const config = createJSTestConfig();
    
    const result = await engine.executeScraping({
      config,
      options: { maxPages: 1, waitForJS: true }
    });

    expect(result.data.length).toBeGreaterThan(0);
  });
});
```

## Monitoring and Debugging

### Comprehensive Logging
```typescript
class ScrapingLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/scraping-errors.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/scraping-combined.log' 
        })
      ]
    });
  }

  logScrapingStart(jobId: string, config: ScraperConfig): void {
    this.logger.info('Scraping job started', {
      jobId,
      url: config.url,
      selectors: Object.keys(config.selectors.fields),
      timestamp: new Date().toISOString()
    });
  }

  logScrapingError(jobId: string, error: Error, context: any): void {
    this.logger.error('Scraping job failed', {
      jobId,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  logPerformanceMetrics(jobId: string, metrics: PerformanceMetrics): void {
    this.logger.info('Scraping performance metrics', {
      jobId,
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Performance Monitoring
```typescript
class PerformanceMonitor {
  private metrics: Map<string, PerformanceData> = new Map();

  startTracking(jobId: string): void {
    this.metrics.set(jobId, {
      startTime: Date.now(),
      memoryStart: process.memoryUsage(),
      pagesProcessed: 0,
      recordsExtracted: 0
    });
  }

  recordPageProcessed(jobId: string, recordCount: number): void {
    const data = this.metrics.get(jobId);
    if (data) {
      data.pagesProcessed++;
      data.recordsExtracted += recordCount;
    }
  }

  getMetrics(jobId: string): PerformanceMetrics | null {
    const data = this.metrics.get(jobId);
    if (!data) return null;

    const now = Date.now();
    const memoryNow = process.memoryUsage();

    return {
      duration: now - data.startTime,
      pagesProcessed: data.pagesProcessed,
      recordsExtracted: data.recordsExtracted,
      recordsPerMinute: (data.recordsExtracted / ((now - data.startTime) / 60000)),
      memoryUsed: memoryNow.heapUsed - data.memoryStart.heapUsed,
      averagePageTime: (now - data.startTime) / data.pagesProcessed
    };
  }
}