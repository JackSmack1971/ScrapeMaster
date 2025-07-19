import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import UserProfileForm from '../components/auth/UserProfileForm';

const UserProfilePage: React.FC = () => {
  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h4" gutterBottom>
          User Profile
        </Typography>
        <UserProfileForm />
      </Box>
    </Container>
  );
};

export default UserProfilePage;