import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import useProjectStore, { type Project } from '../../store/projectStore';

interface ProjectSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
}

const ProjectSettingsDialog: React.FC<ProjectSettingsDialogProps> = ({
  open,
  onClose,
  projectId,
}) => {
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      setCurrentProject(project || null);
      if (project) {
        setName(project.name);
        setDescription(project.description);
      }
    }
  }, [projectId, projects]);

  const handleSave = () => {
    if (currentProject) {
      const updatedProject = { ...currentProject, name, description };
      updateProject(updatedProject);
      onClose();
    }
  };

  if (!currentProject) {
    return null; // Or a loading spinner/error message
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Project Settings</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Project Name"
          type="text"
          fullWidth
          variant="standard"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="description"
          label="Project Description"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="standard"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectSettingsDialog;