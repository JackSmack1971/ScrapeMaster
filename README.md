# ScrapeMaster Pro

ScrapeMaster Pro is an advanced web scraping application built with Node.js, React, TypeScript and Puppeteer. It focuses on extracting structured data from modern websites with heavy JavaScript rendering and complex pagination.

## Project Goals
ScrapeMaster Pro solves the challenge of extracting structured data from modern websites that rely heavily on JavaScript rendering and complex pagination systems. It serves data analysts, researchers, market researchers, and developers who need reliable, automated data collection capabilities without the complexity of enterprise-grade solutions. The application provides value through its ability to handle dynamic content, respect website policies, and deliver clean, exportable data.

## Prerequisites
- Node.js 18 LTS
- npm
- Git

## Environment Setup
```bash
# Verify Node version (should be 18.x.x)
node --version

# Install dependencies
npm install

# Install browser for Puppeteer
npx puppeteer browsers install chrome

# Copy example environment variables and edit values
cp .env.example .env

# Initialize database
npm run db:migrate
npm run db:seed:dev
```

## Development Scripts
```bash
# Start both frontend and backend
npm run dev

# Individual services
npm run dev:frontend  # React dev server on port 3000
npm run dev:backend   # Express server on port 3001

# Database operations
npm run db:migrate
npm run db:rollback
npm run db:reset

# Code quality
npm run lint
npm run lint:fix
npm run type-check
npm run format
```

## Production Scripts
```bash
npm run build   # Compile TypeScript
npm start       # Run compiled application
```

## Testing Commands
```bash
npm run test:unit        # Jest unit tests
npm run test:integration # API integration tests
npm run test:e2e         # Playwright end-to-end tests
npm run test:coverage    # Full suite with coverage
```

## Cross-Platform Compatibility
- The project relies on Node 18 and uses `cross-env` in npm scripts to manage environment variables across platforms.
- Development scripts work on Linux, macOS, and Windows (including WSL). Ensure Chrome dependencies are installed for Puppeteer on your OS.
- Always verify cross-platform compatibility during code review.
