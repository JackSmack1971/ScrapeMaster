import React from 'react';
import { Card, CardContent, Typography, CardActions, Button } from '@mui/material';
import { type Project } from '../../store/projectStore';
import { Link } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete }) => {
  return (
    <Card sx={{ minWidth: 275, maxWidth: 345, m: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div">
          {project.name}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          Created: {new Date(project.createdAt).toLocaleDateString()}
        </Typography>
        <Typography variant="body2">
          {project.description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" component={Link} to={`/projects/${project.id}/settings`}>
          View/Edit
        </Button>
        <Button size="small" onClick={() => onDelete(project.id)} color="error">
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;