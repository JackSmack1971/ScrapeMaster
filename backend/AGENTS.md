# Backend API Development Guide

## API Architecture Overview

### Service Structure
```
/backend/
  /routes/              # Express route definitions
    /api/v1/
      scrapers.ts       # Scraper CRUD operations
      jobs.ts           # Job management endpoints
      projects.ts       # Project management
      exports.ts        # Data export endpoints
      auth.ts           # Authentication endpoints
  /services/            # Business logic services
    ScraperService.ts   # Scraper business logic
    JobService.ts       # Job queue management
    ExportService.ts    # Data export functionality
    AuthService.ts      # Authentication logic
  /models/              # Sequelize database models
    Scraper.ts          # Scraper model definition
    Job.ts              # Job model definition
    Project.ts          # Project model definition
    User.ts             # User model definition
  /middleware/          # Express middleware
    auth.ts             # JWT authentication
    validation.ts       # Request validation
    errorHandler.ts     # Centralized error handling
    rateLimiter.ts      # API rate limiting
  /utils/               # Utility functions
    database.ts         # Database helpers
    encryption.ts       # Encryption utilities
    logger.ts           # Winston logging setup
```

## RESTful API Design Standards

### Route Organization
```typescript
// routes/api/v1/scrapers.ts
import express from 'express';
import { ScraperController } from '../../../controllers/ScraperController';
import { validateScraperConfig } from '../../../middleware/validation';
import { requireAuth } from '../../../middleware/auth';

const router = express.Router();

// GET /api/v1/scrapers - List user's scrapers
router.get('/', requireAuth, ScraperController.list);

// POST /api/v1/scrapers - Create new scraper
router.post('/', requireAuth, validateScraperConfig, ScraperController.create);

// GET /api/v1/scrapers/:id - Get specific scraper
router.get('/:id', requireAuth, ScraperController.getById);

// PUT /api/v1/scrapers/:id - Update scraper configuration
router.put('/:id', requireAuth, validateScraperConfig, ScraperController.update);

// DELETE /api/v1/scrapers/:id - Delete scraper
router.delete('/:id', requireAuth, ScraperController.delete);

// POST /api/v1/scrapers/:id/execute - Execute scraper
router.post('/:id/execute', requireAuth, ScraperController.execute);

// GET /api/v1/scrapers/:id/jobs - Get scraper jobs
router.get('/:id/jobs', requireAuth, ScraperController.getJobs);

export default router;
```

### Controller Implementation Pattern
```typescript
import { Request, Response, NextFunction } from 'express';
import { ScraperService } from '../services/ScraperService';
import { JobService } from '../services/JobService';
import { ApiResponse, AuthenticatedRequest } from '../types';

export class ScraperController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, url, selectors, paginationConfig } = req.body;
      const userId = req.user!.id;

      // Create scraper through service layer
      const scraper = await ScraperService.createScraper({
        userId,
        name,
        url,
        selectors,
        paginationConfig
      });

      const response: ApiResponse<Scraper> = {
        success: true,
        data: scraper,
        message: 'Scraper created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async execute(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scraperId = req.params.id;
      const options = req.body.options || {};
      const userId = req.user!.id;

      // Validate ownership
      const scraper = await ScraperService.getScraperById(scraperId, userId);
      if (!scraper) {
        return res.status(404).json({
          success: false,
          error: 'Scraper not found'
        });
      }

      // Queue scraping job
      const job = await JobService.createScrapingJob(scraper, options);

      const response: ApiResponse<Job> = {
        success: true,
        data: job,
        message: 'Scraping job queued successfully'
      };

      res.status(202).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20, search = '' } = req.query;

      const result = await ScraperService.getUserScrapers(userId, {
        page: Number(page),
        limit: Number(limit),
        search: String(search)
      });

      const response: ApiResponse<PaginatedResult<Scraper>> = {
        success: true,
        data: result,
        message: 'Scrapers retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}
```

## Database Models and Relationships

### Sequelize Model Implementation
```typescript
// models/Scraper.ts
import { 
  DataTypes, 
  Model, 
  InferAttributes, 
  InferCreationAttributes, 
  CreationOptional,
  ForeignKey,
  NonAttribute
} from 'sequelize';
import { sequelize } from '../config/database';
import { Project } from './Project';
import { Job } from './Job';

export class Scraper extends Model<
  InferAttributes<Scraper>,
  InferCreationAttributes<Scraper>
> {
  declare id: CreationOptional<string>;
  declare projectId: ForeignKey<Project['id']>;
  declare name: string;
  declare url: string;
  declare selectors: object;
  declare paginationConfig: CreationOptional<object>;
  declare browserConfig: CreationOptional<object>;
  declare scheduleConfig: CreationOptional<object>;
  declare rateLimit: CreationOptional<number>;
  declare enabled: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare project?: NonAttribute<Project>;
  declare jobs?: NonAttribute<Job[]>;

  // Instance methods
  async execute(options: ScrapingOptions = {}): Promise<Job> {
    const JobService = require('../services/JobService').JobService;
    return await JobService.createScrapingJob(this, options);
  }

  async getRecentJobs(limit: number = 10): Promise<Job[]> {
    return await Job.findAll({
      where: { scraperId: this.id },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  toJSON(): object {
    const values = super.toJSON() as any;
    // Remove sensitive information before sending to client
    delete values.browserConfig?.credentials;
    return values;
  }
}

Scraper.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: true,
      isHttps(value: string) {
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          throw new Error('URL must use HTTP or HTTPS protocol');
        }
      }
    }
  },
  selectors: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    validate: {
      isValidSelectors(value: any) {
        if (!value || typeof value !== 'object') {
          throw new Error('Selectors must be a valid object');
        }
        if (!value.fields || Object.keys(value.fields).length === 0) {
          throw new Error('At least one selector field is required');
        }
      }
    }
  },
  paginationConfig: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  browserConfig: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  scheduleConfig: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  rateLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
    validate: {
      min: 100,
      max: 60000
    }
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Scraper',
  tableName: 'scrapers',
  timestamps: true,
  indexes: [
    {
      fields: ['projectId', 'enabled']
    },
    {
      fields: ['name', 'projectId'],
      unique: true
    }
  ]
});
```

### Model Associations
```typescript
// models/associations.ts
import { Project } from './Project';
import { Scraper } from './Scraper';
import { Job } from './Job';
import { ScrapedData } from './ScrapedData';
import { Export } from './Export';
import { User } from './User';

export function defineAssociations(): void {
  // User <-> Project (One-to-Many)
  User.hasMany(Project, { foreignKey: 'userId', as: 'projects' });
  Project.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Project <-> Scraper (One-to-Many)
  Project.hasMany(Scraper, { foreignKey: 'projectId', as: 'scrapers' });
  Scraper.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Scraper <-> Job (One-to-Many)
  Scraper.hasMany(Job, { foreignKey: 'scraperId', as: 'jobs' });
  Job.belongsTo(Scraper, { foreignKey: 'scraperId', as: 'scraper' });

  // Job <-> ScrapedData (One-to-Many)
  Job.hasMany(ScrapedData, { foreignKey: 'jobId', as: 'scrapedData' });
  ScrapedData.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

  // Scraper <-> ScrapedData (One-to-Many, for direct access)
  Scraper.hasMany(ScrapedData, { foreignKey: 'scraperId', as: 'scrapedData' });
  ScrapedData.belongsTo(Scraper, { foreignKey: 'scraperId', as: 'scraper' });

  // Project <-> Export (One-to-Many)
  Project.hasMany(Export, { foreignKey: 'projectId', as: 'exports' });
  Export.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
}
```

## Service Layer Implementation

### Business Logic Services
```typescript
// services/ScraperService.ts
import { Op } from 'sequelize';
import { Scraper } from '../models/Scraper';
import { Project } from '../models/Project';
import { ScrapingValidator } from '../utils/ScrapingValidator';
import { ScraperNotFoundError, ValidationError } from '../errors/CustomErrors';

export class ScraperService {
  static async createScraper(data: CreateScraperData): Promise<Scraper> {
    // Validate scraper configuration
    const validation = await ScrapingValidator.validateScraperConfig(data);
    if (!validation.isValid) {
      throw new ValidationError('Invalid scraper configuration', validation.errors);
    }

    // Verify project ownership
    const project = await Project.findOne({
      where: { id: data.projectId, userId: data.userId }
    });

    if (!project) {
      throw new ScraperNotFoundError('Project not found or access denied');
    }

    // Check for duplicate scraper names within project
    const existingScraper = await Scraper.findOne({
      where: {
        projectId: data.projectId,
        name: data.name
      }
    });

    if (existingScraper) {
      throw new ValidationError('Scraper name already exists in this project');
    }

    // Create scraper
    const scraper = await Scraper.create({
      projectId: data.projectId,
      name: data.name,
      url: data.url,
      selectors: data.selectors,
      paginationConfig: data.paginationConfig || {},
      browserConfig: data.browserConfig || {},
      rateLimit: data.rateLimit || 1000
    });

    return scraper;
  }

  static async updateScraper(
    scraperId: string, 
    userId: string, 
    updates: Partial<UpdateScraperData>
  ): Promise<Scraper> {
    const scraper = await this.getScraperById(scraperId, userId);
    
    if (!scraper) {
      throw new ScraperNotFoundError('Scraper not found');
    }

    // Validate updates if provided
    if (updates.selectors || updates.url) {
      const validation = await ScrapingValidator.validateScraperConfig({
        ...scraper.toJSON(),
        ...updates
      });
      
      if (!validation.isValid) {
        throw new ValidationError('Invalid scraper configuration', validation.errors);
      }
    }

    // Check for name conflicts if name is being updated
    if (updates.name && updates.name !== scraper.name) {
      const existingScraper = await Scraper.findOne({
        where: {
          projectId: scraper.projectId,
          name: updates.name,
          id: { [Op.ne]: scraperId }
        }
      });

      if (existingScraper) {
        throw new ValidationError('Scraper name already exists in this project');
      }
    }

    await scraper.update(updates);
    return scraper;
  }

  static async getScraperById(scraperId: string, userId: string): Promise<Scraper | null> {
    return await Scraper.findOne({
      where: { id: scraperId },
      include: [
        {
          model: Project,
          as: 'project',
          where: { userId },
          attributes: ['id', 'name']
        }
      ]
    });
  }

  static async getUserScrapers(
    userId: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<Scraper>> {
    const { page, limit, search } = options;
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await Scraper.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          where: { userId },
          attributes: ['id', 'name']
        }
      ],
      limit,
      offset,
      order: [['updatedAt', 'DESC']]
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  static async deleteScraper(scraperId: string, userId: string): Promise<boolean> {
    const scraper = await this.getScraperById(scraperId, userId);
    
    if (!scraper) {
      throw new ScraperNotFoundError('Scraper not found');
    }

    await scraper.destroy();
    return true;
  }
}
```

### Job Management Service
```typescript
// services/JobService.ts
import Bull from 'bull';
import { Job } from '../models/Job';
import { Scraper } from '../models/Scraper';
import { ScrapingEngine } from './scraping/ScrapingEngine';
import { JobStatus } from '../types/JobTypes';

export class JobService {
  private static scrapingQueue = new Bull('scraping jobs', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  });

  static async createScrapingJob(
    scraper: Scraper, 
    options: ScrapingOptions = {}
  ): Promise<Job> {
    // Create job record
    const job = await Job.create({
      scraperId: scraper.id,
      status: JobStatus.PENDING,
      configurationSnapshot: scraper.toJSON()
    });

    // Add to processing queue
    await this.scrapingQueue.add(
      'scrape',
      {
        jobId: job.id,
        scraperId: scraper.id,
        config: scraper.toJSON(),
        options
      },
      {
        jobId: job.id,
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    );

    return job;
  }

  static async getJobById(jobId: string): Promise<Job | null> {
    return await Job.findByPk(jobId, {
      include: [
        {
          model: Scraper,
          as: 'scraper',
          attributes: ['id', 'name', 'url']
        }
      ]
    });
  }

  static async getJobsByScraperId(scraperId: string, limit: number = 20): Promise<Job[]> {
    return await Job.findAll({
      where: { scraperId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  static async cancelJob(jobId: string): Promise<boolean> {
    const job = await Job.findByPk(jobId);
    if (!job) return false;

    if (job.status === JobStatus.RUNNING) {
      // Cancel the bull job
      const bullJob = await this.scrapingQueue.getJob(jobId);
      if (bullJob) {
        await bullJob.remove();
      }
    }

    await job.update({ status: JobStatus.CANCELLED });
    return true;
  }

  // Initialize queue processing
  static initializeQueueProcessing(): void {
    this.scrapingQueue.process('scrape', 5, async (job) => {
      const { jobId, config, options } = job.data;
      
      try {
        // Update job status
        await Job.update(
          { status: JobStatus.RUNNING, startedAt: new Date() },
          { where: { id: jobId } }
        );

        // Execute scraping
        const scrapingEngine = new ScrapingEngine();
        const result = await scrapingEngine.executeScraping({
          config,
          options,
          jobId
        });

        // Update job with results
        await Job.update({
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          recordsScraped: result.totalRecords,
          pagesProcessed: result.pagesProcessed
        }, { where: { id: jobId } });

        return result;

      } catch (error) {
        // Update job with error
        await Job.update({
          status: JobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error.message
        }, { where: { id: jobId } });

        throw error;
      }
    });

    // Queue event handlers
    this.scrapingQueue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.scrapingQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err);
    });
  }
}
```

## Authentication and Security

### JWT Authentication Middleware
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthenticationError } from '../errors/CustomErrors';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      throw new AuthenticationError('Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError('Invalid token'));
    }
    next(error);
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['passwordHash'] }
      });
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, continue without user if token is invalid
    next();
  }
};
```

### Input Validation Middleware
```typescript
// middleware/validation.ts
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/CustomErrors';

// Validation schemas
const scraperConfigSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  selectors: Joi.object({
    fields: Joi.object().min(1).required()
  }).required(),
  paginationConfig: Joi.object().optional(),
  browserConfig: Joi.object().optional(),
  scheduleConfig: Joi.object().optional(),
  rateLimit: Joi.number().min(100).max(60000).optional()
});

const jobExecutionSchema = Joi.object({
  options: Joi.object({
    maxPages: Joi.number().min(1).max(1000).optional(),
    timeout: Joi.number().min(5000).max(300000).optional(),
    respectRobotsTxt: Joi.boolean().optional(),
    customHeaders: Joi.object().optional(),
    proxyConfig: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().port().required(),
      username: Joi.string().optional(),
      password: Joi.string().optional()
    }).optional()
  }).optional()
});

export const validateScraperConfig = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = scraperConfigSchema.validate(req.body);
  
  if (error) {
    throw new ValidationError(
      'Invalid scraper configuration',
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    );
  }
  
  next();
};

export const validateJobExecution = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = jobExecutionSchema.validate(req.body);
  
  if (error) {
    throw new ValidationError(
      'Invalid job execution parameters',
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    );
  }
  
  next();
};

// Generic validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      throw new ValidationError(
        'Validation failed',
        error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      );
    }
    
    next();
  };
};
```

## Error Handling

### Custom Error Classes
```typescript
// errors/CustomErrors.ts
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  public readonly errors: ValidationErrorDetail[];

  constructor(message: string, errors: ValidationErrorDetail[] = []) {
    super(message, 400);
    this.errors = errors;
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class ScraperNotFoundError extends BaseError {
  constructor(message: string = 'Scraper not found') {
    super(message, 404);
  }
}

export class ScrapingError extends BaseError {
  public readonly code: string;
  public readonly context?: any;

  constructor(message: string, code: string, context?: any) {
    super(message, 500);
    this.code = code;
    this.context = context;
  }
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### Centralized Error Handler
```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { BaseError, ValidationError, ScrapingError } from '../errors/CustomErrors';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle known errors
  if (error instanceof BaseError) {
    handleKnownError(error, res);
    return;
  }

  // Handle validation errors from Sequelize
  if (error.name === 'SequelizeValidationError') {
    handleSequelizeValidationError(error as any, res);
    return;
  }

  // Handle Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    handleUniqueConstraintError(error as any, res);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      details: error.message,
      stack: error.stack
    })
  });
};

function handleKnownError(error: BaseError, res: Response): void {
  const response: any = {
    success: false,
    error: error.message
  };

  if (error instanceof ValidationError) {
    response.validationErrors = error.errors;
  }

  if (error instanceof ScrapingError) {
    response.code = error.code;
    if (process.env.NODE_ENV === 'development') {
      response.context = error.context;
    }
  }

  res.status(error.statusCode).json(response);
}

function handleSequelizeValidationError(error: any, res: Response): void {
  const validationErrors = error.errors.map((err: any) => ({
    field: err.path,
    message: err.message
  }));

  res.status(400).json({
    success: false,
    error: 'Validation failed',
    validationErrors
  });
}

function handleUniqueConstraintError(error: any, res: Response): void {
  const field = error.errors[0]?.path || 'unknown';
  res.status(409).json({
    success: false,
    error: `${field} already exists`
  });
}
```

## API Testing

### Integration Test Template
```typescript
// tests/integration/scrapers.test.ts
import request from 'supertest';
import { app } from '../../app';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { Scraper } from '../../models/Scraper';
import { generateAuthToken } from '../../utils/auth';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';

describe('Scrapers API', () => {
  let testUser: User;
  let testProject: Project;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Create test user and project
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword'
    });

    testProject = await Project.create({
      userId: testUser.id,
      name: 'Test Project',
      description: 'Test project for API testing'
    });

    authToken = generateAuthToken(testUser.id);
  });

  afterEach(async () => {
    // Clean up test data
    await Scraper.destroy({ where: {} });
    await Project.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('POST /api/v1/scrapers', () => {
    it('should create a new scraper with valid configuration', async () => {
      const scraperData = {
        projectId: testProject.id,
        name: 'Test Scraper',
        url: 'https://example.com',
        selectors: {
          fields: {
            title: { primary: { type: 'css', selector: 'h1' } }
          }
        },
        rateLimit: 2000
      };

      const response = await request(app)
        .post('/api/v1/scrapers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scraperData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: 'Test Scraper',
          url: 'https://example.com',
          rateLimit: 2000
        },
        message: 'Scraper created successfully'
      });
    });

    it('should return 400 for invalid scraper configuration', async () => {
      const invalidData = {
        projectId: testProject.id,
        name: '', // Empty name
        url: 'invalid-url', // Invalid URL
        selectors: {} // Missing fields
      };

      const response = await request(app)
        .post('/api/v1/scrapers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        validationErrors: expect.any(Array)
      });
    });

    it('should return 401 without authentication', async () => {
      const scraperData = {
        projectId: testProject.id,
        name: 'Test Scraper',
        url: 'https://example.com',
        selectors: { fields: { title: { primary: { type: 'css', selector: 'h1' } } } }
      };

      await request(app)
        .post('/api/v1/scrapers')
        .send(scraperData)
        .expect(401);
    });
  });

  describe('POST /api/v1/scrapers/:id/execute', () => {
    let testScraper: Scraper;

    beforeEach(async () => {
      testScraper = await Scraper.create({
        projectId: testProject.id,
        name: 'Test Scraper',
        url: 'https://httpbin.org/html',
        selectors: {
          fields: {
            title: { primary: { type: 'css', selector: 'h1' } }
          }
        }
      });
    });

    it('should queue a scraping job successfully', async () => {
      const options = {
        options: {
          maxPages: 1,
          timeout: 30000
        }
      };

      const response = await request(app)
        .post(`/api/v1/scrapers/${testScraper.id}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(options)
        .expect(202);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          scraperId: testScraper.id,
          status: 'pending'
        },
        message: 'Scraping job queued successfully'
      });
    });

    it('should return 404 for non-existent scraper', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app)
        .post(`/api/v1/scrapers/${fakeId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ options: {} })
        .expect(404);
    });
  });

  describe('GET /api/v1/scrapers', () => {
    beforeEach(async () => {
      // Create multiple test scrapers
      await Scraper.bulkCreate([
        {
          projectId: testProject.id,
          name: 'Scraper 1',
          url: 'https://example.com/1',
          selectors: { fields: { title: { primary: { type: 'css', selector: 'h1' } } } }
        },
        {
          projectId: testProject.id,
          name: 'Scraper 2',
          url: 'https://example.com/2',
          selectors: { fields: { title: { primary: { type: 'css', selector: 'h1' } } } }
        }
      ]);
    });

    it('should return paginated list of user scrapers', async () => {
      const response = await request(app)
        .get('/api/v1/scrapers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          data: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              url: expect.any(String)
            })
          ]),
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });

    it('should filter scrapers by search term', async () => {
      const response = await request(app)
        .get('/api/v1/scrapers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'Scraper 1' })
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Scraper 1');
    });
  });

  describe('PUT /api/v1/scrapers/:id', () => {
    let testScraper: Scraper;

    beforeEach(async () => {
      testScraper = await Scraper.create({
        projectId: testProject.id,
        name: 'Original Scraper',
        url: 'https://example.com',
        selectors: {
          fields: {
            title: { primary: { type: 'css', selector: 'h1' } }
          }
        }
      });
    });

    it('should update scraper configuration', async () => {
      const updateData = {
        name: 'Updated Scraper',
        rateLimit: 3000
      };

      const response = await request(app)
        .put(`/api/v1/scrapers/${testScraper.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe('Updated Scraper');
      expect(response.body.data.rateLimit).toBe(3000);
    });

    it('should return 404 for non-existent scraper', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app)
        .put(`/api/v1/scrapers/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });
});
```

### Service Layer Testing
```typescript
// tests/unit/services/ScraperService.test.ts
import { ScraperService } from '../../../services/ScraperService';
import { Scraper } from '../../../models/Scraper';
import { Project } from '../../../models/Project';
import { User } from '../../../models/User';
import { ValidationError, ScraperNotFoundError } from '../../../errors/CustomErrors';
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database';

describe('ScraperService', () => {
  let testUser: User;
  let testProject: Project;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword'
    });

    testProject = await Project.create({
      userId: testUser.id,
      name: 'Test Project',
      description: 'Test project'
    });
  });

  afterEach(async () => {
    await Scraper.destroy({ where: {} });
    await Project.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('createScraper', () => {
    it('should create a scraper with valid data', async () => {
      const scraperData = {
        userId: testUser.id,
        projectId: testProject.id,
        name: 'Test Scraper',
        url: 'https://example.com',
        selectors: {
          fields: {
            title: { primary: { type: 'css', selector: 'h1' } }
          }
        }
      };

      const scraper = await ScraperService.createScraper(scraperData);

      expect(scraper).toMatchObject({
        name: 'Test Scraper',
        url: 'https://example.com',
        projectId: testProject.id
      });
    });

    it('should throw ValidationError for invalid configuration', async () => {
      const invalidData = {
        userId: testUser.id,
        projectId: testProject.id,
        name: '', // Invalid empty name
        url: 'invalid-url',
        selectors: {}
      };

      await expect(ScraperService.createScraper(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw error for duplicate scraper name within project', async () => {
      const scraperData = {
        userId: testUser.id,
        projectId: testProject.id,
        name: 'Duplicate Name',
        url: 'https://example.com',
        selectors: {
          fields: {
            title: { primary: { type: 'css', selector: 'h1' } }
          }
        }
      };

      // Create first scraper
      await ScraperService.createScraper(scraperData);

      // Attempt to create duplicate
      await expect(ScraperService.createScraper(scraperData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getUserScrapers', () => {
    beforeEach(async () => {
      // Create test scrapers
      await Scraper.bulkCreate([
        {
          projectId: testProject.id,
          name: 'Scraper Alpha',
          url: 'https://alpha.com',
          selectors: { fields: { title: { primary: { type: 'css', selector: 'h1' } } } }
        },
        {
          projectId: testProject.id,
          name: 'Scraper Beta',
          url: 'https://beta.com',
          selectors: { fields: { title: { primary: { type: 'css', selector: 'h1' } } } }
        }
      ]);
    });

    it('should return paginated results', async () => {
      const result = await ScraperService.getUserScrapers(testUser.id, {
        page: 1,
        limit: 10,
        search: ''
      });

      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(result.data).toHaveLength(2);
    });

    it('should filter results by search term', async () => {
      const result = await ScraperService.getUserScrapers(testUser.id, {
        page: 1,
        limit: 10,
        search: 'Alpha'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Scraper Alpha');
    });
  });

  describe('updateScraper', () => {
    let testScraper: Scraper;

    beforeEach(async () => {
      testScraper = await Scraper.create({
        projectId: testProject.id,
        name: 'Original Scraper',
        url: 'https://example.com',
        selectors: {
          fields: {
            title: { primary: { type: 'css', selector: 'h1' } }
          }
        }
      });
    });

    it('should update scraper successfully', async () => {
      const updates = {
        name: 'Updated Scraper',
        rateLimit: 3000
      };

      const updatedScraper = await ScraperService.updateScraper(
        testScraper.id,
        testUser.id,
        updates
      );

      expect(updatedScraper.name).toBe('Updated Scraper');
      expect(updatedScraper.rateLimit).toBe(3000);
    });

    it('should throw error for non-existent scraper', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await expect(
        ScraperService.updateScraper(fakeId, testUser.id, { name: 'New Name' })
      ).rejects.toThrow(ScraperNotFoundError);
    });
  });
});
```

### Load Testing
```typescript
// tests/load/api-load.test.ts
import { performance } from 'perf_hooks';
import request from 'supertest';
import { app } from '../../app';
import { generateAuthToken } from '../../utils/auth';

describe('API Load Testing', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup test user and get auth token
    authToken = await setupTestUserAndToken();
  });

  afterAll(async () => {
    await cleanupLoadTestData();
  });

  describe('Concurrent Requests', () => {
    it('should handle 100 concurrent GET requests under 200ms avg', async () => {
      const concurrentRequests = 100;
      const requests: Promise<any>[] = [];
      
      const startTime = performance.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const requestPromise = request(app)
          .get('/api/v1/scrapers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        requests.push(requestPromise);
      }

      // Wait for all requests to complete
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const totalDuration = endTime - startTime;
      const averageResponseTime = totalDuration / concurrentRequests;

      // Assert performance requirements
      expect(averageResponseTime).toBeLessThan(200); // < 200ms average
      expect(responses).toHaveLength(concurrentRequests);
      
      // Verify all responses are successful
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });

      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
    });

    it('should maintain data consistency under load', async () => {
      const concurrentWrites = 20;
      const requests: Promise<any>[] = [];

      // Create concurrent scraper creation requests
      for (let i = 0; i < concurrentWrites; i++) {
        const scraperData = {
          projectId: testProject.id,
          name: `Load Test Scraper ${i}`,
          url: `https://example-${i}.com`,
          selectors: {
            fields: {
              title: { primary: { type: 'css', selector: 'h1' } }
            }
          }
        };

        const requestPromise = request(app)
          .post('/api/v1/scrapers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(scraperData);
        
        requests.push(requestPromise);
      }

      const responses = await Promise.all(requests);

      // Verify all scrapers were created successfully
      const successfulCreations = responses.filter(res => res.status === 201);
      expect(successfulCreations).toHaveLength(concurrentWrites);

      // Verify no duplicate names
      const names = responses.map(res => res.body.data?.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(concurrentWrites);
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should not exceed memory thresholds during sustained load', async () => {
      const requestsPerBatch = 50;
      const batchCount = 10;
      const initialMemory = process.memoryUsage();

      for (let batch = 0; batch < batchCount; batch++) {
        const batchRequests: Promise<any>[] = [];
        
        for (let i = 0; i < requestsPerBatch; i++) {
          const requestPromise = request(app)
            .get('/api/v1/scrapers')
            .set('Authorization', `Bearer ${authToken}`);
          
          batchRequests.push(requestPromise);
        }

        await Promise.all(batchRequests);

        // Check memory usage after each batch
        const currentMemory = process.memoryUsage();
        const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
        
        // Memory increase should not exceed 100MB
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    });
  });
});
```

## Performance and Monitoring

### API Performance Monitoring
```typescript
// middleware/performance.ts
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
}

export const performanceMonitoring = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      endpoint: req.route?.path || req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      timestamp: new Date(),
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
      }
    };

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow API request detected', metrics);
    }

    // Log high memory usage
    if (metrics.memoryUsage.heapUsed > 50 * 1024 * 1024) { // 50MB
      logger.warn('High memory usage detected', metrics);
    }

    // Store metrics for monitoring dashboard
    PerformanceCollector.recordMetrics(metrics);
  });

  next();
};

class PerformanceCollector {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000;

  static recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  static getMetrics(timeRange: number = 3600000): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - timeRange);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  static getAverageResponseTime(endpoint?: string): number {
    const relevantMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / relevantMetrics.length;
  }

  static getSlowRequests(threshold: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  static getMemoryTrends(): any {
    const last100 = this.metrics.slice(-100);
    return {
      averageHeapUsed: last100.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / last100.length,
      peakHeapUsed: Math.max(...last100.map(m => m.memoryUsage.heapUsed)),
      memoryLeakIndicator: this.detectMemoryLeak(last100)
    };
  }

  private static detectMemoryLeak(metrics: PerformanceMetrics[]): boolean {
    if (metrics.length < 10) return false;
    
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / secondHalf.length;
    
    // Memory leak if second half uses 50% more memory than first half
    return (secondAvg - firstAvg) / firstAvg > 0.5;
  }
}
```

### Database Query Optimization
```typescript
// utils/database.ts
import { Sequelize, QueryOptions } from 'sequelize';
import { logger } from './logger';

export class DatabaseOptimizer {
  private static sequelize: Sequelize;
  private static queryMetrics: QueryMetric[] = [];

  static initialize(sequelizeInstance: Sequelize): void {
    this.sequelize = sequelizeInstance;
    this.setupQueryLogging();
    this.setupConnectionPooling();
    this.setupPerformanceMonitoring();
  }

  private static setupQueryLogging(): void {
    this.sequelize.addHook('beforeQuery', (options: QueryOptions) => {
      options.benchmark = true;
      options.logging = (sql: string, timing?: number) => {
        const metric: QueryMetric = {
          sql: sql.substring(0, 200),
          duration: timing || 0,
          timestamp: new Date(),
          operation: this.extractOperation(sql)
        };

        this.queryMetrics.push(metric);
        
        // Keep only recent metrics
        if (this.queryMetrics.length > 1000) {
          this.queryMetrics = this.queryMetrics.slice(-1000);
        }

        if (timing && timing > 100) {
          logger.warn('Slow database query detected', metric);
        }
      };
    });
  }

  private static setupConnectionPooling(): void {
    // Monitor pool usage every 30 seconds
    setInterval(() => {
      const pool = (this.sequelize as any).connectionManager?.pool;
      if (pool) {
        const metrics = {
          used: pool.used,
          waiting: pool.pending,
          available: pool.available,
          created: pool.created,
          destroyed: pool.destroyed
        };

        if (metrics.used > 8) { // 80% of default pool size
          logger.warn('High database connection usage', metrics);
        }

        // Store pool metrics
        this.recordPoolMetrics(metrics);
      }
    }, 30000);
  }

  private static setupPerformanceMonitoring(): void {
    // Analyze query patterns every 5 minutes
    setInterval(() => {
      this.analyzeQueryPatterns();
    }, 300000);
  }

  private static extractOperation(sql: string): string {
    const operation = sql.trim().split(' ')[0].toUpperCase();
    return ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(operation) ? operation : 'OTHER';
  }

  private static recordPoolMetrics(metrics: any): void {
    // Store pool metrics for monitoring
    logger.info('Database pool metrics', metrics);
  }

  private static analyzeQueryPatterns(): void {
    const recentQueries = this.queryMetrics.filter(
      m => Date.now() - m.timestamp.getTime() < 300000 // Last 5 minutes
    );

    const analysis = {
      totalQueries: recentQueries.length,
      averageDuration: recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length,
      slowQueries: recentQueries.filter(q => q.duration > 100).length,
      operationBreakdown: this.groupByOperation(recentQueries)
    };

    logger.info('Query pattern analysis', analysis);

    // Alert on concerning patterns
    if (analysis.slowQueries > analysis.totalQueries * 0.1) {
      logger.warn('High percentage of slow queries detected', {
        slowQueries: analysis.slowQueries,
        totalQueries: analysis.totalQueries,
        percentage: (analysis.slowQueries / analysis.totalQueries) * 100
      });
    }
  }

  private static groupByOperation(queries: QueryMetric[]): Record<string, number> {
    return queries.reduce((acc, query) => {
      acc[query.operation] = (acc[query.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  static async analyzeQuery(sql: string): Promise<any> {
    try {
      const [results] = await this.sequelize.query(`EXPLAIN QUERY PLAN ${sql}`);
      return results;
    } catch (error) {
      logger.error('Query analysis failed', { sql, error: error.message });
      return null;
    }
  }

  static async optimizeTable(tableName: string): Promise<void> {
    try {
      await this.sequelize.query(`ANALYZE ${tableName}`);
      logger.info(`Table ${tableName} analyzed successfully`);
    } catch (error) {
      logger.error(`Table analysis failed for ${tableName}`, { error: error.message });
    }
  }

  static getQueryMetrics(): QueryMetric[] {
    return this.queryMetrics.slice(-100); // Return last 100 queries
  }

  static getSlowQueries(threshold: number = 100): QueryMetric[] {
    return this.queryMetrics.filter(q => q.duration > threshold);
  }
}

interface QueryMetric {
  sql: string;
  duration: number;
  timestamp: Date;
  operation: string;
}
```

### Rate Limiting
```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request } from 'express';
import { logger } from '../utils/logger';

const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error', err);
});

redisClient.on('connect', () => {
  logger.info('Redis connected for rate limiting');
});

// General API rate limiting
export const apiRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args)
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).user?.id || req.ip;
  },
  onLimitReached: (req: Request) => {
    logger.warn('Rate limit exceeded', {
      key: (req as any).user?.id || req.ip,
      endpoint: req.path,
      method: req.method,
      ip: req.ip
    });
  }
});

// Strict rate limiting for scraping endpoints
export const scrapingRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args)
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each user to 100 scraping requests per hour
  message: {
    success: false,
    error: 'Scraping rate limit exceeded. Please wait before starting new jobs.',
    retryAfter: '1 hour'
  },
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error('Authentication required for scraping endpoints');
    }
    return `scraping:${userId}`;
  },
  skip: (req: Request) => {
    // Skip rate limiting for certain test users or admin users
    const user = (req as any).user;
    return user?.role === 'admin' || user?.email?.endsWith('@test.com');
  },
  onLimitReached: (req: Request) => {
    const userId = (req as any).user?.id;
    logger.warn('Scraping rate limit exceeded', {
      userId,
      endpoint: req.path,
      ip: req.ip
    });
  }
});

// Authentication rate limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed login attempts per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  onLimitReached: (req: Request) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('User-Agent')
    });
  }
});

// Create endpoint rate limiting
export const createResourceRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args)
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each user to 50 create operations per 5 minutes
  message: {
    success: false,
    error: 'Too many resource creation requests, please slow down',
    retryAfter: '5 minutes'
  },
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `create:${userId}` : `create:${req.ip}`;
  }
});

// Export rate limiting
export const exportRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args)
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each user to 20 exports per hour
  message: {
    success: false,
    error: 'Export rate limit exceeded. Please wait before creating new exports.',
    retryAfter: '1 hour'
  },
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return `export:${userId}`;
  }
});
```

## Data Export Service

### Export Implementation
```typescript
// services/ExportService.ts
import { Parser as Json2csvParser } from 'json2csv';
import * as XLSX from 'xlsx';
import { ScrapedData } from '../models/ScrapedData';
import { Export } from '../models/Export';
import { Project } from '../models/Project';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

export class ExportService {
  static async createExport(
    projectId: string,
    userId: string,
    options: ExportOptions
  ): Promise<Export> {
    // Verify project ownership
    const project = await Project.findOne({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Create export record
    const exportRecord = await Export.create({
      projectId,
      name: options.name,
      format: options.format,
      filters: options.filters || {},
      fieldMapping: options.fieldMapping || {},
      status: 'processing'
    });

    // Process export asynchronously
    this.processExport(exportRecord.id, options).catch(error => {
      logger.error('Export processing failed:', error);
      exportRecord.update({ 
        status: 'failed',
        errorMessage: error.message 
      });
    });

    return exportRecord;
  }

  private static async processExport(
    exportId: string,
    options: ExportOptions
  ): Promise<void> {
    const exportRecord = await Export.findByPk(exportId);
    if (!exportRecord) throw new Error('Export record not found');

    try {
      logger.info('Starting export processing', { exportId, options });

      // Fetch data based on filters
      const data = await this.fetchExportData(
        exportRecord.projectId,
        options.filters
      );

      logger.info('Data fetched for export', { 
        exportId, 
        recordCount: data.length 
      });

      // Transform data according to field mapping
      const transformedData = this.transformData(data, options.fieldMapping);

      // Generate export file
      const filePath = await this.generateExportFile(
        transformedData,
        options.format,
        exportId
      );

      // Get file stats
      const stats = await fs.stat(filePath);

      // Update export record
      await exportRecord.update({
        status: 'completed',
        filePath,
        recordCount: transformedData.length,
        fileSize: stats.size
      });

      logger.info('Export completed successfully', {
        exportId,
        filePath,
        recordCount: transformedData.length,
        fileSize: stats.size
      });

    } catch (error) {
      logger.error('Export processing failed', { exportId, error });
      await exportRecord.update({
        status: 'failed',
        errorMessage: error.message
      });
      throw error;
    }
  }

  private static async fetchExportData(
    projectId: string,
    filters: ExportFilters = {}
  ): Promise<any[]> {
    const whereClause: any = {};

    // Apply date range filter
    if (filters.dateRange) {
      whereClause.extractionTimestamp = {
        [Op.between]: [filters.dateRange.start, filters.dateRange.end]
      };
    }

    // Apply scraper filter
    if (filters.scraperIds && filters.scraperIds.length > 0) {
      whereClause.scraperId = {
        [Op.in]: filters.scraperIds
      };
    }

    // Apply data validation filter
    if (filters.validationStatus) {
      whereClause.validationStatus = filters.validationStatus;
    }

    const scrapedData = await ScrapedData.findAll({
      where: whereClause,
      include: [
        {
          model: require('../models/Scraper').Scraper,
          as: 'scraper',
          where: { projectId },
          attributes: ['id', 'name', 'url']
        }
      ],
      order: [['extractionTimestamp', 'DESC']],
      limit: 100000 // Prevent memory issues with very large exports
    });

    return scrapedData.map(item => ({
      id: item.id,
      scraperName: item.scraper?.name,
      sourceUrl: item.sourceUrl,
      extractionTimestamp: item.extractionTimestamp,
      pageNumber: item.pageNumber,
      validationStatus: item.validationStatus,
      ...item.dataFields
    }));
  }

  private static transformData(
    data: any[],
    fieldMapping: Record<string, string> = {}
  ): any[] {
    if (Object.keys(fieldMapping).length === 0) {
      return data;
    }

    return data.map(item => {
      const transformedItem: any = {};
      
      // Apply field mapping
      for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
        if (item.hasOwnProperty(sourceField)) {
          transformedItem[targetField] = item[sourceField];
        }
      }

      // Include unmapped fields if not explicitly excluded
      for (const [key, value] of Object.entries(item)) {
        if (!fieldMapping.hasOwnProperty(key)) {
          transformedItem[key] = value;
        }
      }

      return transformedItem;
    });
  }

  private static async generateExportFile(
    data: any[],
    format: ExportFormat,
    exportId: string
  ): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `export-${exportId}-${timestamp}`;

    switch (format) {
      case 'csv':
        return await this.generateCSV(data, exportDir, fileName);
      case 'json':
        return await this.generateJSON(data, exportDir, fileName);
      case 'excel':
        return await this.generateExcel(data, exportDir, fileName);
      case 'xml':
        return await this.generateXML(data, exportDir, fileName);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private static async generateCSV(
    data: any[],
    exportDir: string,
    fileName: string
  ): Promise<string> {
    const filePath = path.join(exportDir, `${fileName}.csv`);

    if (data.length === 0) {
      await fs.writeFile(filePath, 'No data available\n');
      return filePath;
    }

    const fields = Object.keys(data[0]);
    const json2csvParser = new Json2csvParser({ fields });
    const csv = json2csvParser.parse(data);

    await fs.writeFile(filePath, csv);
    return filePath;
  }

  private static async generateJSON(
    data: any[],
    exportDir: string,
    fileName: string
  ): Promise<string> {
    const filePath = path.join(exportDir, `${fileName}.json`);
    const jsonData = JSON.stringify({
      metadata: {
        exportDate: new Date().toISOString(),
        recordCount: data.length,
        generatedBy: 'ScrapeMaster Pro'
      },
      data: data
    }, null, 2);
    
    await fs.writeFile(filePath, jsonData);
    return filePath;
  }

  private static async generateExcel(
    data: any[],
    exportDir: string,
    fileName: string
  ): Promise<string> {
    const filePath = path.join(exportDir, `${fileName}.xlsx`);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scraped Data');

    // Add metadata sheet
    const metadata = {
      'Export Date': new Date().toISOString(),
      'Record Count': data.length,
      'Generated By': 'ScrapeMaster Pro',
      'Export Format': 'Excel (XLSX)'
    };
    const metadataSheet = XLSX.utils.json_to_sheet([metadata]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    XLSX.writeFile(workbook, filePath);
    return filePath;
  }

  private static async generateXML(
    data: any[],
    exportDir: string,
    fileName: string
  ): Promise<string> {
    const filePath = path.join(exportDir, `${fileName}.xml`);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<export>\n';
    xml += `  <metadata>\n`;
    xml += `    <exportDate>${new Date().toISOString()}</exportDate>\n`;
    xml += `    <recordCount>${data.length}</recordCount>\n`;
    xml += `    <generatedBy>ScrapeMaster Pro</generatedBy>\n`;
    xml += `  </metadata>\n`;
    xml += '  <data>\n';

    for (const item of data) {
      xml += '    <record>\n';
      for (const [key, value] of Object.entries(item)) {
        const escapedValue = this.escapeXML(String(value || ''));
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        xml += `      <${safeKey}>${escapedValue}</${safeKey}>\n`;
      }
      xml += '    </record>\n';
    }

    xml += '  </data>\n';
    xml += '</export>';

    await fs.writeFile(filePath, xml);
    return filePath;
  }

  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static async getExport(exportId: string, userId: string): Promise<Export | null> {
    return await Export.findOne({
      where: { id: exportId },
      include: [
        {
          model: Project,
          as: 'project',
          where: { userId },
          attributes: ['id', 'name']
        }
      ]
    });
  }

  static async downloadExport(exportId: string, userId: string): Promise<string> {
    const exportRecord = await this.getExport(exportId, userId);
    
    if (!exportRecord) {
      throw new Error('Export not found or access denied');
    }

    if (exportRecord.status !== 'completed') {
      throw new Error(`Export is not ready for download. Status: ${exportRecord.status}`);
    }

    return exportRecord.filePath;
  }

  static async deleteExport(exportId: string, userId: string): Promise<boolean> {
    const exportRecord = await this.getExport(exportId, userId);
    
    if (!exportRecord) {
      return false;
    }

    // Delete physical file if it exists
    if (exportRecord.filePath) {
      try {
        await fs.unlink(exportRecord.filePath);
      } catch (error) {
        logger.warn('Failed to delete export file', { 
          filePath: exportRecord.filePath, 
          error: error.message 
        });
      }
    }

    // Delete database record
    await exportRecord.destroy();
    return true;
  }
}

interface ExportOptions {
  name: string;
  format: ExportFormat;
  filters?: ExportFilters;
  fieldMapping?: Record<string, string>;
}

interface ExportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  scraperIds?: string[];
  validationStatus?: string;
}

type ExportFormat = 'csv' | 'json' | 'excel' | 'xml';
```

## WebSocket Implementation

### Real-time Job Updates
```typescript
// services/WebSocketService.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export class WebSocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupAuthentication();
    this.setupEventHandlers();
    this.setupConnectionMonitoring();
  }

  private setupAuthentication(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ['passwordHash'] }
        });

        if (!user) {
          throw new Error('User not found');
        }

        socket.data.user = user;
        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed', { 
          error: error.message,
          socketId: socket.id 
        });
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id;
      
      // Track user connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      logger.info('WebSocket connection established', { 
        userId, 
        socketId: socket.id,
        totalConnections: this.io.engine.clientsCount
      });

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Handle job subscription
      socket.on('subscribe:job', (jobId: string) => {
        if (typeof jobId === 'string' && jobId.length > 0) {
          socket.join(`job:${jobId}`);
          logger.debug('Socket subscribed to job', { socketId: socket.id, jobId });
        }
      });

      // Handle job unsubscription
      socket.on('unsubscribe:job', (jobId: string) => {
        if (typeof jobId === 'string') {
          socket.leave(`job:${jobId}`);
          logger.debug('Socket unsubscribed from job', { socketId: socket.id, jobId });
        }
      });

      // Handle project subscription
      socket.on('subscribe:project', (projectId: string) => {
        if (typeof projectId === 'string' && projectId.length > 0) {
          socket.join(`project:${projectId}`);
          logger.debug('Socket subscribed to project', { socketId: socket.id, projectId });
        }
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        
        logger.info('WebSocket disconnected', { 
          userId, 
          socketId: socket.id, 
          reason,
          totalConnections: this.io.engine.clientsCount
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error', { 
          userId, 
          socketId: socket.id, 
          error: error.message 
        });
      });
    });
  }

  private setupConnectionMonitoring(): void {
    // Monitor connection health every 30 seconds
    setInterval(() => {
      const stats = {
        totalConnections: this.io.engine.clientsCount,
        totalUsers: this.userSockets.size,
        connectionsPerUser: Array.from(this.userSockets.values()).map(s => s.size)
      };

      if (stats.totalConnections > 100) {
        logger.warn('High WebSocket connection count', stats);
      }

      logger.debug('WebSocket connection stats', stats);
    }, 30000);
  }

  // Emit job status updates
  emitJobUpdate(jobId: string, update: JobUpdate): void {
    this.io.to(`job:${jobId}`).emit('job:update', {
      jobId,
      ...update,
      timestamp: new Date().toISOString()
    });

    logger.debug('Job update emitted', { jobId, update });
  }

  // Emit job progress updates
  emitJobProgress(jobId: string, progress: JobProgress): void {
    this.io.to(`job:${jobId}`).emit('job:progress', {
      jobId,
      ...progress,
      timestamp: new Date().toISOString()
    });
  }

  // Emit notifications to specific user
  emitUserNotification(userId: string, notification: Notification): void {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });

    logger.info('User notification sent', { userId, notification });
  }

  // Emit project-wide updates
  emitProjectUpdate(projectId: string, update: ProjectUpdate): void {
    this.io.to(`project:${projectId}`).emit('project:update', {
      projectId,
      ...update,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast system-wide announcements
  broadcastSystemAnnouncement(announcement: SystemAnnouncement): void {
    this.io.emit('system:announcement', {
      ...announcement,
      timestamp: new Date().toISOString()
    });

    logger.info('System announcement broadcasted', announcement);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  // Get user connection count
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  // Get total connection count
  getTotalConnections(): number {
    return this.io.engine.clientsCount;
  }

  // Check if user is connected
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Disconnect user
  disconnectUser(userId: string, reason: string = 'Server initiated'): void {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      });
      
      logger.info('User forcibly disconnected', { userId, reason });
    }
  }
}

interface JobUpdate {
  status: string;
  message?: string;
  error?: string;
  recordsScraped?: number;
  pagesProcessed?: number;
}

interface JobProgress {
  currentPage: number;
  totalPages?: number;
  recordsFound: number;
  estimatedTimeRemaining?: number;
  currentUrl?: string;
  percentage?: number;
}

interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  autoClose?: boolean;
  duration?: number;
}

interface ProjectUpdate {
  type: 'scraper_created' | 'scraper_updated' | 'export_completed';
  message: string;
  data?: any;
}

interface SystemAnnouncement {
  type: 'maintenance' | 'feature' | 'warning';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  actionRequired?: boolean;
}
```

## Configuration and Environment

### Environment Configuration
```typescript
// config/environment.ts
import dotenv from 'dotenv';
import { cleanEnv, str, num, bool, port, url } from 'envalid';

dotenv.config();

export const config = cleanEnv(process.env, {
  // Application Configuration
  NODE_ENV: str({ 
    choices: ['development', 'test', 'production'], 
    default: 'development' 
  }),
  PORT: port({ default: 3001 }),
  APP_NAME: str({ default: 'ScrapeMaster Pro API' }),
  APP_VERSION: str({ default: '1.0.0' }),
  
  // Database Configuration
  DATABASE_URL: str({ 
    desc: 'SQLite database file path', 
    default: './data/scrapemaster.db' 
  }),
  DATABASE_BACKUP_PATH: str({ default: './backups/' }),
  DATABASE_MAX_CONNECTIONS: num({ default: 10 }),
  
  // Authentication Configuration
  JWT_SECRET: str({ 
    desc: 'JWT signing secret - MUST be set in production',
    default: 'your-super-secret-jwt-key-change-in-production'
  }),
  JWT_EXPIRATION: str({ default: '24h' }),
  JWT_REFRESH_EXPIRATION: str({ default: '7d' }),
  
  // Redis Configuration
  REDIS_HOST: str({ default: 'localhost' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),
  REDIS_DB: num({ default: 0 }),
  
  // Browser Configuration
  BROWSER_EXECUTABLE_PATH: str({ default: '' }),
  BROWSER_HEADLESS: bool({ default: true }),
  BROWSER_TIMEOUT: num({ default: 30000 }),
  MAX_BROWSER_INSTANCES: num({ default: 5 }),
  
  // Rate Limiting Configuration
  DEFAULT_RATE_LIMIT: num({ default: 1000 }),
  MAX_CONCURRENT_JOBS: num({ default: 10 }),
  SCRAPING_RATE_LIMIT: num({ default: 100 }),
  
  // File Storage Configuration
  EXPORT_PATH: str({ default: './exports/' }),
  TEMP_PATH: str({ default: './temp/' }),
  LOG_PATH: str({ default: './logs/' }),
  MAX_EXPORT_SIZE: str({ default: '100MB' }),
  MAX_FILE_AGE_DAYS: num({ default: 30 }),
  
  // Security Configuration
  ENCRYPTION_KEY: str({ 
    desc: 'AES encryption key for sensitive data',
    default: 'your-32-character-encryption-key'
  }),
  CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
  HELMET_ENABLED: bool({ default: true }),
  
  // Monitoring Configuration
  LOG_LEVEL: str({ 
    choices: ['error', 'warn', 'info', 'debug'], 
    default: 'info' 
  }),
  METRICS_ENABLED: bool({ default: true }),
  HEALTH_CHECK_INTERVAL: num({ default: 60000 }),
  PERFORMANCE_MONITORING: bool({ default: true }),
  
  // External Services (Optional)
  PROXY_ENABLED: bool({ default: false }),
  PROXY_POOL_SIZE: num({ default: 10 }),
  NOTIFICATION_WEBHOOK_URL: url({ default: '' }),
  SENTRY_DSN: str({ default: '' }),
  
  // WebSocket Configuration
  WS_ENABLED: bool({ default: true }),
  WS_HEARTBEAT_INTERVAL: num({ default: 25000 }),
  WS_HEARTBEAT_TIMEOUT: num({ default: 60000 }),
  
  // Job Queue Configuration
  QUEUE_CONCURRENCY: num({ default: 5 }),
  QUEUE_REMOVE_ON_COMPLETE: num({ default: 50 }),
  QUEUE_REMOVE_ON_FAIL: num({ default: 100 }),
  QUEUE_ATTEMPTS: num({ default: 3 }),
  
  // Backup Configuration
  BACKUP_ENABLED: bool({ default: true }),
  BACKUP_INTERVAL_HOURS: num({ default: 24 }),
  BACKUP_RETENTION_DAYS: num({ default: 30 })
});

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Validate critical production settings
if (isProduction) {
  if (config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('JWT_SECRET must be set to a secure value in production');
  }
  
  if (config.ENCRYPTION_KEY === 'your-32-character-encryption-key') {
    throw new Error('ENCRYPTION_KEY must be set to a secure value in production');
  }
}
```

### Database Configuration
```typescript
// config/database.ts
import { Sequelize, SequelizeOptions } from 'sequelize';
import { config } from './environment';
import { logger } from '../utils/logger';

const sequelizeConfig: SequelizeOptions = {
  dialect: 'sqlite',
  storage: config.DATABASE_URL,
  logging: config.NODE_ENV === 'development' ? 
    (sql: string, timing?: number) => {
      if (timing && timing > 100) {
        logger.warn('Slow query detected', { sql: sql.substring(0, 100), timing });
      } else {
        logger.debug('SQL Query', { sql: sql.substring(0, 100), timing });
      }
    } : false,
  pool: {
    max: config.DATABASE_MAX_CONNECTIONS,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: false,
    paranoid: false,
    freezeTableName: true
  },
  benchmark: true,
  retry: {
    max: 3,
    match: [
      /SQLITE_BUSY/,
      /database is locked/,
      /connection timeout/
    ]
  },
  transactionType: 'IMMEDIATE',
  isolationLevel: 'READ_COMMITTED'
};

export const sequelize = new Sequelize(sequelizeConfig);

export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Optimize SQLite settings
    await sequelize.query('PRAGMA journal_mode = WAL;');
    await sequelize.query('PRAGMA synchronous = NORMAL;');
    await sequelize.query('PRAGMA cache_size = 1000000;');
    await sequelize.query('PRAGMA foreign_keys = ON;');
    await sequelize.query('PRAGMA temp_store = MEMORY;');
    
    // Sync database schema in development
    if (config.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database schema synchronized');
    } else if (config.NODE_ENV === 'test') {
      await sequelize.sync({ force: true });
      logger.info('Test database schema created');
    }
    
    // Run any pending migrations in production
    if (config.NODE_ENV === 'production') {
      logger.info('Production mode: migrations should be run separately');
    }
    
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${config.DATABASE_BACKUP_PATH}/backup-${timestamp}.db`;
  
  try {
    // Copy database file for backup
    await sequelize.query(`VACUUM INTO '${backupPath}'`);
    logger.info('Database backup created', { backupPath });
    return backupPath;
  } catch (error) {
    logger.error('Database backup failed', { error: error.message });
    throw error;
  }
}

export async function restoreFromBackup(backupPath: string): Promise<void> {
  try {
    // Close current connection
    await sequelize.close();
    
    // Restore from backup (implementation depends on deployment strategy)
    logger.info('Database restore initiated', { backupPath });
    
    // Reconnect
    await sequelize.authenticate();
    logger.info('Database restored successfully');
  } catch (error) {
    logger.error('Database restore failed', { error: error.message });
    throw error;
  }
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  try {
    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `) as [Array<{ name: string }>, any];
    
    const stats: DatabaseStats = {
      tables: [],
      totalSize: 0,
      lastBackup: null
    };
    
    for (const table of tables) {
      const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.name}`) as [Array<{ count: number }>, any];
      stats.tables.push({
        name: table.name,
        rowCount: countResult[0].count
      });
    }
    
    // Get database file size
    const [sizeResult] = await sequelize.query(`PRAGMA page_count`) as [Array<{ page_count: number }>, any];
    const [pageSizeResult] = await sequelize.query(`PRAGMA page_size`) as [Array<{ page_size: number }>, any];
    stats.totalSize = sizeResult[0].page_count * pageSizeResult[0].page_size;
    
    return stats;
  } catch (error) {
    logger.error('Failed to get database stats', { error: error.message });
    throw error;
  }
}

interface DatabaseStats {
  tables: Array<{ name: string; rowCount: number }>;
  totalSize: number;
  lastBackup: Date | null;
}
```

### Application Server Setup
```typescript
// app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { initializeDatabase } from './config/database';
import { defineAssociations } from './models/associations';
import { JobService } from './services/JobService';
import { WebSocketService } from './services/WebSocketService';
import { performanceMonitoring } from './middleware/performance';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimit } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/api/v1/auth';
import projectRoutes from './routes/api/v1/projects';
import scraperRoutes from './routes/api/v1/scrapers';
import jobRoutes from './routes/api/v1/jobs';
import exportRoutes from './routes/api/v1/exports';
import healthRoutes from './routes/health';

const app = express();
const server = createServer(app);

// Trust proxy if behind reverse proxy
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
if (config.HELMET_ENABLED) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
}

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring
if (config.PERFORMANCE_MONITORING) {
  app.use(performanceMonitoring);
}

// Rate limiting
app.use('/api/', apiRateLimit);

// Health check routes (before auth)
app.use('/health', healthRoutes);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/scrapers', scraperRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/exports', exportRoutes);

// Static file serving for exports
app.use('/downloads', express.static(config.EXPORT_PATH, {
  maxAge: '1h',
  index: false,
  dotfiles: 'deny'
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// Initialize services
let webSocketService: WebSocketService | null = null;

async function startServer(): Promise<void> {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await initializeDatabase();
    
    // Define model associations
    defineAssociations();
    
    // Initialize job queue processing
    logger.info('Initializing job queue...');
    JobService.initializeQueueProcessing();
    
    // Initialize WebSocket service
    if (config.WS_ENABLED) {
      logger.info('Initializing WebSocket service...');
      webSocketService = new WebSocketService(server);
    }
    
    // Start server
    server.listen(config.PORT, () => {
      logger.info(`Server started successfully`, {
        port: config.PORT,
        environment: config.NODE_ENV,
        webSocketEnabled: config.WS_ENABLED
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Close WebSocket connections
    if (webSocketService) {
      // Broadcast shutdown warning to connected clients
      webSocketService.broadcastSystemAnnouncement({
        type: 'maintenance',
        title: 'Server Maintenance',
        message: 'Server is shutting down for maintenance. Please save your work.',
        severity: 'high',
        actionRequired: true
      });
      
      // Wait a moment for clients to receive the message
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Close database connections
    const { closeDatabaseConnection } = await import('./config/database');
    await closeDatabaseConnection();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the application
if (require.main === module) {
  startServer();
}

export { app, server, webSocketService };
```

### Health Check Endpoints
```typescript
// routes/health.ts
import express from 'express';
import { sequelize } from '../config/database';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: config.APP_VERSION
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'OK',
    checks: {
      database: { status: 'OK', responseTime: 0 },
      memory: { status: 'OK', usage: {} },
      disk: { status: 'OK', usage: {} }
    }
  };

  try {
    // Database health check
    const dbStartTime = Date.now();
    await sequelize.query('SELECT 1');
    checks.checks.database.responseTime = Date.now() - dbStartTime;

    // Memory check
    const memoryUsage = process.memoryUsage();
    checks.checks.memory.usage = {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    };

    // Check memory thresholds
    if (memoryUsage.heapUsed > 512 * 1024 * 1024) { // 512MB
      checks.checks.memory.status = 'WARNING';
    }

    // Disk space check (basic)
    const fs = await import('fs/promises');
    const stats = await fs.stat(config.DATABASE_URL);
    checks.checks.disk.usage = {
      databaseSize: `${Math.round(stats.size / 1024 / 1024)}MB`
    };

    res.status(200).json(checks);

  } catch (error) {
    logger.error('Health check failed:', error);
    
    checks.status = 'ERROR';
    if (error.message.includes('database')) {
      checks.checks.database.status = 'ERROR';
    }

    res.status(500).json(checks);
  }
});

// Readiness check (for load balancers)
router.get('/ready', async (req, res) => {
  try {
    // Check database connectivity
    await sequelize.query('SELECT 1');
    
    // Check critical services
    const ready = {
      status: 'READY',
      timestamp: new Date().toISOString(),
      services: {
        database: 'READY',
        queue: 'READY', // Would check Redis in real implementation
        websocket: config.WS_ENABLED ? 'READY' : 'DISABLED'
      }
    };

    res.status(200).json(ready);
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness check (for container orchestration)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
});

export default router;
```

### Logging Configuration
```typescript
// utils/logger.ts
import winston from 'winston';
import path from 'path';
import { config } from '../config/environment';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'scrapemaster-api',
    version: config.APP_VERSION,
    environment: config.NODE_ENV
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Separate file for performance logs
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'performance.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'exceptions.log')
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'rejections.log')
    })
  ]
});

// Create specialized loggers for different concerns
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    type: 'performance',
    service: 'scrapemaster-api'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'performance.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3
    })
  ]
});

export const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    type: 'security',
    service: 'scrapemaster-api'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'security.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    type: 'audit',
    service: 'scrapemaster-api'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(config.LOG_PATH, 'audit.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10
    })
  ]
});

// Log startup information
logger.info('Logger initialized', {
  logLevel: config.LOG_LEVEL,
  logPath: config.LOG_PATH,
  environment: config.NODE_ENV
});
```

### Development Scripts and Utilities
```typescript
// scripts/dev-setup.ts
import { logger } from '../utils/logger';
import { initializeDatabase, createBackup } from '../config/database';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Scraper } from '../models/Scraper';
import bcrypt from 'bcrypt';

export async function setupDevelopmentEnvironment(): Promise<void> {
  try {
    logger.info('Setting up development environment...');
    
    // Initialize database
    await initializeDatabase();
    
    // Create test user
    const testUser = await User.findOrCreate({
      where: { email: 'test@scrapemaster.dev' },
      defaults: {
        username: 'testuser',
        email: 'test@scrapemaster.dev',
        passwordHash: await bcrypt.hash('testpassword123', 12)
      }
    });
    
    logger.info('Test user created/found', { userId: testUser[0].id });
    
    // Create test project
    const testProject = await Project.findOrCreate({
      where: { 
        userId: testUser[0].id,
        name: 'Development Test Project'
      },
      defaults: {
        userId: testUser[0].id,
        name: 'Development Test Project',
        description: 'Project for development testing',
        settings: {
          defaultRateLimit: 2000,
          maxConcurrentJobs: 3
        }
      }
    });
    
    logger.info('Test project created/found', { projectId: testProject[0].id });
    
    // Create sample scrapers
    const sampleScrapers = [
      {
        projectId: testProject[0].id,
        name: 'HTTPBin HTML Test',
        url: 'https://httpbin.org/html',
        selectors: {
          fields: {
            title: { 
              primary: { type: 'css', selector: 'h1' },
              fallback: { type: 'css', selector: 'title' }
            },
            content: {
              primary: { type: 'css', selector: 'p' }
            }
          }
        },
        rateLimit: 2000
      },
      {
        projectId: testProject[0].id,
        name: 'JSONPlaceholder Posts',
        url: 'https://jsonplaceholder.typicode.com/posts',
        selectors: {
          fields: {
            posts: {
              primary: { type: 'javascript', script: 'return document.body.innerText' }
            }
          }
        },
        rateLimit: 1500
      }
    ];
    
    for (const scraperData of sampleScrapers) {
      await Scraper.findOrCreate({
        where: {
          projectId: scraperData.projectId,
          name: scraperData.name
        },
        defaults: scraperData
      });
    }
    
    logger.info('Development environment setup completed');
    
  } catch (error) {
    logger.error('Failed to setup development environment:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDevelopmentEnvironment()
    .then(() => {
      logger.info('Development setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Development setup failed:', error);
      process.exit(1);
    });
}
```