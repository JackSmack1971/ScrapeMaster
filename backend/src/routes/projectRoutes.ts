import { Router } from 'express';
import { getProjects, createProject, getProjectById, updateProject, deleteProject } from '../controllers/projectController';
import { protect } from '../middleware/authMiddleware';
import { validateProjectCreation, validateProjectUpdate, validateProjectId } from '../middleware/validationMiddleware';

const router = Router();

router.use(protect); // All project routes are protected

router.route('/')
  .get(getProjects)
  .post(validateProjectCreation(), createProject);

router.route('/:id')
  .get(validateProjectId(), getProjectById)
  .put(validateProjectUpdate(), updateProject)
  .delete(validateProjectId(), deleteProject);

export default router;