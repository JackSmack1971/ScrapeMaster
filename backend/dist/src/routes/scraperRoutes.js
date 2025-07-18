"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scraperController_1 = require("../controllers/scraperController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect); // All scraper routes are protected
// Routes for scrapers within a project
router.route('/projects/:id/scrapers')
    .get((0, validationMiddleware_1.validateProjectId)(), scraperController_1.getScrapers)
    .post((0, validationMiddleware_1.validateScraperCreation)(), scraperController_1.createScraper);
// Routes for individual scrapers
router.route('/scrapers/:id')
    .get((0, validationMiddleware_1.validateScraperId)(), scraperController_1.getScraperById)
    .put((0, validationMiddleware_1.validateScraperUpdate)(), scraperController_1.updateScraper)
    .delete((0, validationMiddleware_1.validateScraperId)(), scraperController_1.deleteScraper);
exports.default = router;
