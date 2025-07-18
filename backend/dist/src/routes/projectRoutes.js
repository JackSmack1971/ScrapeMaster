"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect); // All project routes are protected
router.route('/')
    .get(projectController_1.getProjects)
    .post((0, validationMiddleware_1.validateProjectCreation)(), projectController_1.createProject);
router.route('/:id')
    .get((0, validationMiddleware_1.validateProjectId)(), projectController_1.getProjectById)
    .put((0, validationMiddleware_1.validateProjectUpdate)(), projectController_1.updateProject)
    .delete((0, validationMiddleware_1.validateProjectId)(), projectController_1.deleteProject);
exports.default = router;
