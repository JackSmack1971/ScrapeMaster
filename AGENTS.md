# ScrapeMaster Pro - AI Agent Development Guide

## Project Overview
ScrapeMaster Pro is a personal web scraping application with advanced JavaScript rendering and pagination capabilities. Built with Node.js, React, TypeScript, and Puppeteer for reliable data extraction from modern websites.

## Repository Structure and Navigation

### Key Directories
```
/src/                   # Frontend React application
  /components/          # React UI components
  /services/           # Business logic and API clients
  /stores/             # Zustand state management
  /utils/              # Shared utility functions
  /types/              # TypeScript type definitions
  /hooks/              # Custom React hooks
/backend/              # Node.js Express API server
  /routes/             # API endpoint definitions
  /services/           # Business logic services
  /models/             # Database models (Sequelize)
  /middleware/         # Express middleware
  /scraping/           # Puppeteer scraping engine
/tests/                # Test suites (unit, integration, e2e)
/docs/                 # Project documentation
/scripts/              # Build and deployment scripts
```

### Navigation Tips
- Use `find . -name "*.ts" -o -name "*.tsx" | grep -i <keyword>` to locate files by content area
- Frontend components follow feature-based organization: `/src/components/scraper/`, `/src/components/dashboard/`
- Backend services mirror frontend features: `/backend/services/scraper/`, `/backend/services/export/`
- Look for `index.ts` files as entry points to understand module structure
- Check `/src/types/` for data models and API interfaces

## Development Environment Setup

### Prerequisites and Installation
```bash
# Node.js 18 LTS required
node --version  # Should be 18.x.x

# Install dependencies
npm install

# Install browser for Puppeteer
npx puppeteer browsers install chrome

# Set up environment variables
cp .env.example .env
# Edit .env with appropriate values

# Initialize database
npm run db:migrate
npm run db:seed:dev
```

### Development Commands
```bash
# Start development servers (concurrent)
npm run dev              # Starts both frontend and backend

# Individual services
npm run dev:frontend     # React dev server (port 3000)
npm run dev:backend      # Express server (port 3001)

# Database operations
npm run db:migrate       # Run pending migrations
npm run db:rollback      # Rollback last migration
npm run db:reset         # Reset database to clean state

# Testing
npm run test:unit        # Jest unit tests
npm run test:integration # API integration tests
npm run test:e2e         # Playwright end-to-end tests
npm run test:coverage    # Full test suite with coverage

# Code quality
npm run lint            # ESLint checking
npm run lint:fix        # Auto-fix linting issues
npm run type-check      # TypeScript compilation check
npm run format          # Prettier formatting
```

## Technology Stack and Patterns

### Frontend (React + TypeScript)
- **Component Architecture**: Functional components with hooks, following React 18 patterns
- **State Management**: Zustand for global state, local useState for component state
- **Styling**: Material-UI v5 with Emotion CSS-in-JS
- **Type Safety**: Strict TypeScript, no `any` types allowed
- **Performance**: React.memo for expensive components, useMemo/useCallback for optimization

### Backend (Node.js + Express)
- **API Design**: RESTful APIs with OpenAPI documentation
- **Database**: SQLite with Sequelize ORM, migrations for schema changes
- **Authentication**: JWT tokens with refresh token rotation
- **Validation**: Joi schema validation for all inputs
- **Error Handling**: Centralized error middleware with typed error responses

### Web Scraping Engine (Puppeteer)
- **Browser Management**: Headless Chrome with configurable options
- **Page Handling**: Robust error handling and timeout management
- **Data Extraction**: CSS selectors with fallback strategies
- **Pagination**: Intelligent detection of pagination patterns
- **Rate Limiting**: Respectful scraping with configurable delays

## Testing and Validation Requirements

### Test Coverage Standards
- **Minimum Coverage**: 90% overall, 95% for critical business logic
- **Unit Tests**: All pure functions, utilities, and business logic
- **Integration Tests**: API endpoints, database operations, external services
- **E2E Tests**: Complete user workflows from scraper creation to data export

### Testing Patterns
```typescript
// Unit test template
describe('ScraperService', () => {
  beforeEach(() => {
    // Setup test database and mocks
  });

  afterEach(() => {
    // Cleanup
  });

  it('should extract data from valid CSS selector', async () => {
    // Arrange
    const mockPage = createMockPage();
    const selector = '.content h2';
    
    // Act
    const result = await scraperService.extractData(mockPage, selector);
    
    // Assert
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      text: expect.any(String),
      url: expect.stringMatching(/^https?:\/\//)
    });
  });
});
```

### Performance Testing
- **Scraping Performance**: Must achieve 1000+ records per minute
- **API Response Times**: 95th percentile < 200ms for standard operations
- **Memory Usage**: Monitor for leaks, especially in long-running scraping jobs
- **Database Performance**: Query times < 100ms with proper indexing

### Validation Checklist
✅ All TypeScript compilation errors resolved  
✅ ESLint rules pass with zero warnings  
✅ Unit tests achieve 90%+ coverage  
✅ Integration tests pass for all API endpoints  
✅ E2E tests cover critical user workflows  
✅ Performance benchmarks meet targets  
✅ Security scan shows no high-severity issues  
✅ Documentation updated for public APIs  

## Quality Standards and Code Review

### Code Quality Requirements
- **TypeScript**: Strict mode enabled, explicit return types for functions
- **Complexity**: Maximum cyclomatic complexity of 10 per function
- **Documentation**: JSDoc for all public APIs, inline comments for complex logic
- **Error Handling**: Comprehensive error boundaries and graceful degradation
- **Security**: Input validation, output encoding, secure credential storage

### Review Checklist
- [ ] Code follows TypeScript strict mode guidelines
- [ ] Proper error handling with typed error responses
- [ ] Security considerations addressed (input validation, XSS prevention)
- [ ] Performance impact assessed and optimized
- [ ] Unit tests comprehensive with edge cases
- [ ] Documentation updated for public APIs
- [ ] No hardcoded secrets or credentials
- [ ] Cross-platform compatibility verified

## Domain-Specific Guidelines

### Web Scraping Best Practices
- **Respect robots.txt**: Always check and honor robots.txt directives
- **Rate Limiting**: Implement delays between requests (minimum 1 second)
- **User Agent Rotation**: Use realistic user agent strings, rotate appropriately
- **Error Recovery**: Handle network failures, timeouts, and page structure changes
- **JavaScript Handling**: Wait for dynamic content to load before extraction
- **Pagination Detection**: Support numbered pagination, infinite scroll, "Load More" buttons

### Data Management
- **Validation**: Validate all extracted data against expected schemas
- **Deduplication**: Implement hash-based duplicate detection
- **Storage**: Efficient SQLite usage with proper indexing
- **Export**: Support multiple formats (CSV, JSON, Excel) with proper encoding
- **Privacy**: Minimal data collection, secure local storage

### Security Considerations
- **Input Sanitization**: Validate URLs, CSS selectors, and user inputs
- **Credential Management**: Secure storage of API keys and authentication tokens
- **Network Security**: HTTPS for all external communications
- **Local Security**: Encrypt sensitive data at rest using AES-256

## Performance and Scalability

### Performance Targets
- **UI Responsiveness**: First Contentful Paint < 1.5s, TTI < 3s
- **API Performance**: 95th percentile response time < 200ms
- **Scraping Throughput**: 1000+ records processed per minute
- **Memory Efficiency**: < 512MB per scraping process
- **Concurrent Operations**: Support 10 simultaneous scraping jobs

### Optimization Strategies
- **Database**: Use prepared statements, implement query analysis
- **Frontend**: Code splitting, lazy loading, efficient re-renders
- **Backend**: Connection pooling, response caching, job queuing
- **Scraping**: Browser instance reuse, request batching, intelligent timeouts

## Work Presentation and Communication

### Commit Message Format
```
type(scope): brief description

Detailed explanation of changes, including:
- What was changed and why
- Any breaking changes or migration notes
- Performance or security implications
- Related issue numbers

Examples:
feat(scraping): add infinite scroll pagination detection
fix(api): resolve memory leak in long-running jobs
docs(readme): update installation instructions for macOS
```

### Pull Request Template
```
## Summary
Brief description of changes and motivation

## Changes Made
- [ ] Feature implementation
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Performance impact assessed

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests updated if needed
- [ ] Manual testing completed

## Security and Performance
- [ ] Security implications reviewed
- [ ] Performance impact measured
- [ ] Breaking changes documented

## Deployment Notes
Any special deployment considerations or migration steps
```

### Issue Reporting
- Provide minimal reproduction steps
- Include environment details (OS, Node version, browser)
- Attach relevant logs and error messages
- Specify expected vs actual behavior
- Tag with appropriate labels (bug, enhancement, security)

## Emergency Procedures

### Security Issues
1. Immediately isolate affected systems
2. Document the security incident
3. Implement temporary fixes
4. Notify stakeholders
5. Conduct post-incident review

### Performance Problems
1. Check system resource usage
2. Analyze performance monitoring data
3. Identify bottlenecks using profiling
4. Implement targeted optimizations
5. Validate improvements with benchmarks

### Data Loss Prevention
1. Stop all scraping operations immediately
2. Verify backup integrity
3. Implement data recovery procedures
4. Validate data consistency
5. Resume operations with additional safeguards