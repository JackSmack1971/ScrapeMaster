import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { CssBaseline } from '@mui/material'; // Keep CssBaseline separately if needed globally
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import useAuthStore from './store/authStore';
import UserProfilePage from './pages/UserProfilePage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import JobDashboard from './components/dashboard/JobDashboard'; // Import JobDashboard

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<div>Welcome to ScrapeMaster Pro!</div>} />
        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Protected Routes */}
        <Route element={<ProtectedRoute isAuthenticated={useAuthStore().isAuthenticated} />}>
          <Route path="/dashboard" element={<ProjectDashboardPage />} />
          <Route path="/monitor" element={<JobDashboard />} /> {/* New route for JobDashboard */}
          <Route path="/profile" element={<UserProfilePage />} />
          {/* Project Management Routes */}
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
        </Route>
        {/* Add more routes as needed */}
      </Routes>
    </MainLayout>
  );
}

export default App;
