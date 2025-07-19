import React, { useEffect } from 'react';
import { Container, Typography, Box, Grid, Button } from '@mui/material';
import ProjectCard from '../components/projects/ProjectCard';
import useProjectStore, { type Project } from '../store/projectStore';
import { useNavigate } from 'react-router-dom';

const ProjectDashboardPage: React.FC = () => {
  const { projects, deleteProject, setProjects } = useProjectStore();
  const navigate = useNavigate();

  // Simulate fetching projects from an API
  useEffect(() => {
    const fetchedProjects: Project[] = [
      { id: '1', name: 'Website Scraper', description: 'Scrapes data from e-commerce websites.', createdAt: '2023-01-15T10:00:00Z' },
      { id: '2', name: 'News Aggregator', description: 'Collects news articles from various sources.', createdAt: '2023-02-20T11:30:00Z' },
      { id: '3', name: 'Social Media Monitor', description: 'Monitors social media for brand mentions.', createdAt: '2023-03-10T14:45:00Z' },
    ];
    setProjects(fetchedProjects);
  }, [setProjects]);

  const handleEditProject = (project: Project) => {
    navigate(`/projects/${project.id}/settings`);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
      console.log(`Project ${id} deleted.`);
    }
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography component="h1" variant="h4">
          My Projects
        </Typography>
        <Button variant="contained" onClick={() => navigate('/projects/new')}>
          Create New Project
        </Button>
      </Box>
      <Grid container spacing={4}>
        {projects.map((project) => (
          <Grid item key={project.id} xs={12} sm={6} md={4} component="div">
            <ProjectCard
              project={project}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
            />
          </Grid>
        ))}
        {projects.length === 0 && (
          <Grid item xs={12} component="div">
            <Typography variant="body1" color="text.secondary" align="center">
              No projects found. Create a new one to get started!
            </Typography>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default ProjectDashboardPage;