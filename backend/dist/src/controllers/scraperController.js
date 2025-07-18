"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteScraper = exports.updateScraper = exports.getScraperById = exports.createScraper = exports.getScrapers = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Scraper_1 = __importDefault(require("../../models/Scraper")); // Adjust path as needed
const Project_1 = __importDefault(require("../../models/Project")); // Adjust path as needed
const errorMiddleware_1 = require("../middleware/errorMiddleware");
// Assert the type of the imported models
const ScraperModel = Scraper_1.default;
const ProjectModel = Project_1.default;
// @desc    Get all scrapers for a specific project
// @route   GET /api/projects/:projectId/scrapers
// @access  Private
const getScrapers = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const projectId = req.params.id;
    const project = await ProjectModel.findOne({
        where: { id: projectId, user_id: req.user.id },
    });
    if (!project) {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Project not found', 404);
    }
    const scrapers = await ScraperModel.findAll({
        where: { project_id: projectId },
    });
    res.status(200).json(scrapers);
});
exports.getScrapers = getScrapers;
// @desc    Create a new scraper for a project
// @route   POST /api/projects/:projectId/scrapers
// @access  Private
const createScraper = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const projectId = req.params.id;
    const { name, url, selectors, pagination_config, browser_config, schedule_config, rate_limit, enabled } = req.body;
    const project = await ProjectModel.findOne({
        where: { id: projectId, user_id: req.user.id },
    });
    if (!project) {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Project not found', 404);
    }
    const scraper = await ScraperModel.create({
        name: name,
        url: url,
        selectors,
        pagination_config,
        browser_config,
        schedule_config,
        rate_limit,
        enabled,
        project_id: projectId, // Cast to number for project_id
    });
    res.status(201).json(scraper);
});
exports.createScraper = createScraper;
// @desc    Get a single scraper configuration by ID
// @route   GET /api/scrapers/:id
// @access  Private
const getScraperById = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const scraperId = req.params.id;
    const scraper = await ScraperModel.findByPk(scraperId);
    if (!scraper) {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Scraper not found', 404);
    }
    // Verify project ownership
    const project = await ProjectModel.findByPk(scraper.project_id);
    if (!project || project.user_id !== req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized to access this scraper', 401);
    }
    res.status(200).json(scraper);
});
exports.getScraperById = getScraperById;
// @desc    Update a scraper configuration by ID
// @route   PUT /api/scrapers/:id
// @access  Private
const updateScraper = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const scraperId = req.params.id;
    const { name, url, selectors, pagination_config, browser_config, schedule_config, rate_limit, enabled } = req.body;
    const scraper = await ScraperModel.findByPk(scraperId);
    if (!scraper) {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Scraper not found', 404);
    }
    // Verify project ownership
    const project = await ProjectModel.findByPk(scraper.project_id);
    if (!project || project.user_id !== req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized to update this scraper', 401);
    }
    if (name !== undefined)
        scraper.name = name;
    if (url !== undefined)
        scraper.url = url;
    if (selectors !== undefined)
        scraper.selectors = selectors;
    if (pagination_config !== undefined)
        scraper.pagination_config = pagination_config;
    if (browser_config !== undefined)
        scraper.browser_config = browser_config;
    if (schedule_config !== undefined)
        scraper.schedule_config = schedule_config;
    if (rate_limit !== undefined)
        scraper.rate_limit = rate_limit;
    if (enabled !== undefined)
        scraper.enabled = enabled;
    const updatedScraper = await scraper.save();
    res.status(200).json(updatedScraper);
});
exports.updateScraper = updateScraper;
// @desc    Delete a scraper configuration by ID
// @route   DELETE /api/scrapers/:id
// @access  Private
const deleteScraper = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const scraperId = req.params.id;
    const scraper = await ScraperModel.findByPk(scraperId);
    if (!scraper) {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Scraper not found', 404);
    }
    // Verify project ownership
    const project = await ProjectModel.findByPk(scraper.project_id);
    if (!project || project.user_id !== req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized to delete this scraper', 401);
    }
    await scraper.destroy();
    res.status(200).json({ message: 'Scraper removed' });
});
exports.deleteScraper = deleteScraper;
