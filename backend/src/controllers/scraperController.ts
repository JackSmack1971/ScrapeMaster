import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthenticatedRequest, ScraperRequest, IScraper, ScraperInstance, ProjectInstance } from '../types';
import Scraper from '../../models/Scraper'; // Adjust path as needed
import Project from '../../models/Project'; // Adjust path as needed
import { CustomError } from '../middleware/errorMiddleware';

// Assert the type of the imported models
const ScraperModel = Scraper as typeof Scraper & (new () => ScraperInstance);
const ProjectModel = Project as typeof Project & (new () => ProjectInstance);

// @desc    Get all scrapers for a specific project
// @route   GET /api/projects/:projectId/scrapers
// @access  Private
const getScrapers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const projectId = req.params.id as string;

  const project = await ProjectModel.findOne({
    where: { id: projectId, user_id: req.user.id },
  });

  if (!project) {
    res.status(404);
    throw new CustomError('Project not found', 404);
  }

  const scrapers = await ScraperModel.findAll({
    where: { project_id: projectId },
  });

  res.status(200).json(scrapers);
});

// @desc    Create a new scraper for a project
// @route   POST /api/projects/:projectId/scrapers
// @access  Private
const createScraper = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const projectId = req.params.id as string;
  const { name, url, selectors, pagination_config, browser_config, schedule_config, rate_limit, enabled }: ScraperRequest = req.body;

  const project = await ProjectModel.findOne({
    where: { id: projectId, user_id: req.user.id },
  });

  if (!project) {
    res.status(404);
    throw new CustomError('Project not found', 404);
  }

  const scraper = await ScraperModel.create({
    name: name as string,
    url: url as string,
    selectors,
    pagination_config,
    browser_config,
    schedule_config,
    rate_limit,
    enabled,
    project_id: projectId as unknown as number, // Cast to number for project_id
  });

  res.status(201).json(scraper);
});

// @desc    Get a single scraper configuration by ID
// @route   GET /api/scrapers/:id
// @access  Private
const getScraperById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const scraperId = req.params.id as string;

  const scraper = await ScraperModel.findByPk(scraperId);

  if (!scraper) {
    res.status(404);
    throw new CustomError('Scraper not found', 404);
  }

  // Verify project ownership
  const project = await ProjectModel.findByPk(scraper.project_id);

  if (!project || project.user_id !== req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized to access this scraper', 401);
  }

  res.status(200).json(scraper);
});

// @desc    Update a scraper configuration by ID
// @route   PUT /api/scrapers/:id
// @access  Private
const updateScraper = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const scraperId = req.params.id as string;
  const { name, url, selectors, pagination_config, browser_config, schedule_config, rate_limit, enabled }: ScraperRequest = req.body;

  const scraper = await ScraperModel.findByPk(scraperId);

  if (!scraper) {
    res.status(404);
    throw new CustomError('Scraper not found', 404);
  }

  // Verify project ownership
  const project = await ProjectModel.findByPk(scraper.project_id);

  if (!project || project.user_id !== req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized to update this scraper', 401);
  }

  if (name !== undefined) scraper.name = name;
  if (url !== undefined) scraper.url = url;
  if (selectors !== undefined) scraper.selectors = selectors;
  if (pagination_config !== undefined) scraper.pagination_config = pagination_config;
  if (browser_config !== undefined) scraper.browser_config = browser_config;
  if (schedule_config !== undefined) scraper.schedule_config = schedule_config;
  if (rate_limit !== undefined) scraper.rate_limit = rate_limit;
  if (enabled !== undefined) scraper.enabled = enabled;

  const updatedScraper = await scraper.save();
  res.status(200).json(updatedScraper);
});

// @desc    Delete a scraper configuration by ID
// @route   DELETE /api/scrapers/:id
// @access  Private
const deleteScraper = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const scraperId = req.params.id as string;

  const scraper = await ScraperModel.findByPk(scraperId);

  if (!scraper) {
    res.status(404);
    throw new CustomError('Scraper not found', 404);
  }

  // Verify project ownership
  const project = await ProjectModel.findByPk(scraper.project_id);

  if (!project || project.user_id !== req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized to delete this scraper', 401);
  }

  await scraper.destroy();
  res.status(200).json({ message: 'Scraper removed' });
});

export { getScrapers, createScraper, getScraperById, updateScraper, deleteScraper };