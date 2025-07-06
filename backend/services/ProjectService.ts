import { v4 as uuid } from 'uuid';
import { Project } from '../types/api';

const projects: Project[] = [];

export class ProjectService {
  static list(userId: string): Project[] {
    return projects.filter(p => p.userId === userId);
  }

  static create(userId: string, name: string, description?: string): Project {
    const project: Project = { id: uuid(), userId, name, description };
    projects.push(project);
    return project;
  }

  static get(projectId: string, userId: string): Project | undefined {
    return projects.find(p => p.id === projectId && p.userId === userId);
  }

  static update(projectId: string, userId: string, name: string, description?: string): Project | undefined {
    const project = this.get(projectId, userId);
    if (!project) return undefined;
    project.name = name;
    project.description = description;
    return project;
  }

  static delete(projectId: string, userId: string): boolean {
    const index = projects.findIndex(p => p.id === projectId && p.userId === userId);
    if (index === -1) return false;
    projects.splice(index, 1);
    return true;
  }
}
