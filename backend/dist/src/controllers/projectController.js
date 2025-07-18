"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.updateProject = exports.getProjectById = exports.createProject = exports.getProjects = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Project_1 = __importDefault(require("../../models/Project")); // Adjust path as needed
const User_1 = __importDefault(require("../../models/User")); // Needed to associate projects with users
const errorMiddleware_1 = require("../middleware/errorMiddleware");
// Assert the type of the imported models
const ProjectModel = Project_1.default;
const UserModel = User_1.default;
// @desc    Get all projects for the authenticated user
// @route   GET /api/projects
// @access  Private
const getProjects = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const projects = await ProjectModel.findAll({
        where: { user_id: req.user.id }, // Changed to user_id
        include: [{ model: UserModel, attributes: ['id', 'username', 'email'] }],
    });
    res.status(200).json(projects);
});
exports.getProjects = getProjects;
// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const { name, description } = req.body; // req.body is now typed
    const project = await ProjectModel.create({
        name,
        description,
        user_id: req.user.id, // Changed to user_id and cast to number
    });
    res.status(201).json(project);
});
exports.createProject = createProject;
// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const project = await ProjectModel.findOne({
        where: { id: req.params.id, user_id: req.user.id }, // Changed to user_id and cast req.params.id
        include: [{ model: UserModel, attributes: ['id', 'username', 'email'] }],
    }); // Cast to ProjectInstance
    if (project) {
        res.status(200).json(project);
    }
    else {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Project not found', 404);
    }
});
exports.getProjectById = getProjectById;
// @desc    Update a project by ID
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const { name, description } = req.body;
    const project = await ProjectModel.findOne({
        where: { id: req.params.id, user_id: req.user.id }, // Changed to user_id and cast req.params.id
    }); // Cast to ProjectInstance
    if (project) {
        project.name = name || project.name;
        project.description = description || project.description;
        const updatedProject = await project.save();
        res.status(200).json(updatedProject);
    }
    else {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Project not found', 404);
    }
});
exports.updateProject = updateProject;
// @desc    Delete a project by ID
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !req.user.id) {
        res.status(401);
        throw new errorMiddleware_1.CustomError('Not authorized, user ID not found', 401);
    }
    const project = await ProjectModel.findOne({
        where: { id: req.params.id, user_id: req.user.id }, // Changed to user_id and cast req.params.id
    }); // Cast to ProjectInstance
    if (project) {
        await project.destroy();
        res.status(200).json({ message: 'Project removed' });
    }
    else {
        res.status(404);
        throw new errorMiddleware_1.CustomError('Project not found', 404);
    }
});
exports.deleteProject = deleteProject;
