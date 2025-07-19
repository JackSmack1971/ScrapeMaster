import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, Button } from '@mui/material';
import ProjectSettingsDialog from '../components/projects/ProjectSettingsDialog';

const ProjectSettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [open, setOpen] = useState(true); // Open the dialog by default when the page is accessed

  const handleClose = () => {
    setOpen(false);
    // Optionally, navigate back or to dashboard after closing
    // navigate('/dashboard');
  };

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Project Settings for ID: {id}
        </Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Open Settings Dialog</Button>
        {id && (
          <ProjectSettingsDialog
            open={open}
            onClose={handleClose}
            projectId={id}
          />
        )}
      </Box>
    </Container>
  );
};

export default ProjectSettingsPage;