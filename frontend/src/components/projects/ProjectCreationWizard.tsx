import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Container,
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import useProjectStore from '../../store/projectStore';
import { useNavigate } from 'react-router-dom';

const steps = ['Project Details', 'Confirmation'];

interface ProjectDetails {
  name: string;
  description: string;
}

const ProjectCreationWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<ProjectDetails>({
    name: '',
    description: '',
  });

  const addProject = useProjectStore((state) => state.addProject);
  const navigate = useNavigate();

  const handleNext = () => {
    if (activeStep === 0) {
      if (!validateStep1()) {
        return;
      }
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProjectDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: '', // Clear error when user types
    }));
  };

  const validateStep1 = () => {
    let valid = true;
    const newErrors = { name: '', description: '' };

    if (!projectDetails.name.trim()) {
      newErrors.name = 'Project name is required';
      valid = false;
    }
    if (!projectDetails.description.trim()) {
      newErrors.description = 'Project description is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleCreateProject = () => {
    const newProject = {
      id: uuidv4(),
      name: projectDetails.name,
      description: projectDetails.description,
      createdAt: new Date().toISOString(),
    };
    addProject(newProject);
    navigate('/dashboard'); // Redirect to dashboard after creation
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Project Name"
              name="name"
              value={projectDetails.name}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
            />
            <TextField
              label="Project Description"
              name="description"
              value={projectDetails.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={4}
              required
              error={!!errors.description}
              helperText={errors.description}
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Project Details
            </Typography>
            <Typography>
              <strong>Name:</strong> {projectDetails.name}
            </Typography>
            <Typography>
              <strong>Description:</strong> {projectDetails.description}
            </Typography>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography component="h1" variant="h4" align="center" sx={{ mb: 4 }}>
        Create New Project
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box>
        {getStepContent(activeStep)}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={handleCreateProject}>
              Create Project
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default ProjectCreationWizard;