import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Container } from '@mui/material';
import useAuthStore from '../../store/authStore';

const UserProfileForm: React.FC = () => {
  const { user, login } = useAuthStore(); // Assuming 'login' can also update user data
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.id || ''); // Using id as a placeholder for name
  const [errors, setErrors] = useState({ email: '', name: '' });

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.id);
    }
  }, [user]);

  const validate = () => {
    let valid = true;
    const newErrors = { email: '', name: '' };

    if (!email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }

    if (!name) {
      newErrors.name = 'Name is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) {
      console.log('User profile updated:', { email, name });
      // In a real application, you would send this data to your backend
      // and then update the global state upon successful response.
      // For now, simulate an update:
      if (user) {
        login({ ...user, email, id: name }); // Simulate updating user data
      }
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Edit Profile
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Name"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Update Profile
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default UserProfileForm;