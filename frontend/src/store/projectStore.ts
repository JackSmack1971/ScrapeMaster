import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  setProjects: (projects: Project[]) => void;
}

const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (updatedProject) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      ),
    })),
  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    })),
  setProjects: (projects) => set({ projects }),
}));

export default useProjectStore;