import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthenticatedRequest, ProjectRequest, IProject, ProjectInstance, UserInstance } from '../types';
import Project from '../../models/Project'; // Adjust path as needed
import User from '../../models/User'; // Needed to associate projects with users
import { CustomError } from '../middleware/errorMiddleware';

// Assert the type of the imported models
const ProjectModel = Project as typeof Project & (new () => ProjectInstance);
const UserModel = User as typeof User & (new () => UserInstance);

// @desc    Get all projects for the authenticated user
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const projects = await ProjectModel.findAll({
    where: { user_id: req.user.id }, // Changed to user_id
    include: [{ model: UserModel, attributes: ['id', 'username', 'email'] }],
  });

  res.status(200).json(projects);
});

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const { name, description }: ProjectRequest = req.body; // req.body is now typed

  const project = await ProjectModel.create({
    name,
    description,
    user_id: req.user.id as number, // Changed to user_id and cast to number
  });

  res.status(201).json(project);
});

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const project = await ProjectModel.findOne({
    where: { id: req.params.id as string, user_id: req.user.id }, // Changed to user_id and cast req.params.id
    include: [{ model: UserModel, attributes: ['id', 'username', 'email'] }],
  }) as ProjectInstance; // Cast to ProjectInstance

  if (project) {
    res.status(200).json(project);
  } else {
    res.status(404);
    throw new CustomError('Project not found', 404);
  }
});

// @desc    Update a project by ID
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const { name, description }: ProjectRequest = req.body;

  const project = await ProjectModel.findOne({
    where: { id: req.params.id as string, user_id: req.user.id }, // Changed to user_id and cast req.params.id
  }) as ProjectInstance; // Cast to ProjectInstance

  if (project) {
    project.name = name || project.name;
    project.description = description || project.description;

    const updatedProject = await project.save();
    res.status(200).json(updatedProject);
  } else {
    res.status(404);
    throw new CustomError('Project not found', 404);
  }
});

// @desc    Delete a project by ID
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new CustomError('Not authorized, user ID not found', 401);
  }

  const project = await ProjectModel.findOne({
    where: { id: req.params.id as string, user_id: req.user.id }, // Changed to user_id and cast req.params.id
  }) as ProjectInstance; // Cast to ProjectInstance

  if (project) {
    await project.destroy();
    res.status(200).json({ message: 'Project removed' });
  } else {
    res.status(404);
    throw new CustomError('Project not found', 404);
  }
});

export { getProjects, createProject, getProjectById, updateProject, deleteProject };