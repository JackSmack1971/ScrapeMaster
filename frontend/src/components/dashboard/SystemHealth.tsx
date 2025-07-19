import React from 'react';
import { Paper, Typography, Box, LinearProgress } from '@mui/material';
import { styled } from '@mui/system';

interface SystemHealthProps {
  cpuUsage: number; // Percentage
  memoryUsage: number; // Percentage
  diskUsage: number; // Percentage
  timestamp: number; // Unix timestamp
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
}));

const ProgressBarContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '8px',
});

const Label = styled(Typography)({
  minWidth: '80px',
  marginRight: '16px',
});

const SystemHealth: React.FC<SystemHealthProps> = ({ cpuUsage, memoryUsage, diskUsage, timestamp }) => {
  return (
    <StyledPaper elevation={3}>
      <Typography variant="h6" gutterBottom>System Health</Typography>

      <ProgressBarContainer>
        <Label variant="body2">CPU:</Label>
        <LinearProgress variant="determinate" value={cpuUsage} sx={{ flexGrow: 1, height: 10 }} />
        <Typography variant="body2" sx={{ ml: 2 }}>{cpuUsage.toFixed(1)}%</Typography>
      </ProgressBarContainer>

      <ProgressBarContainer>
        <Label variant="body2">Memory:</Label>
        <LinearProgress variant="determinate" value={memoryUsage} sx={{ flexGrow: 1, height: 10 }} color="secondary" />
        <Typography variant="body2" sx={{ ml: 2 }}>{memoryUsage.toFixed(1)}%</Typography>
      </ProgressBarContainer>

      <ProgressBarContainer>
        <Label variant="body2">Disk:</Label>
        <LinearProgress variant="determinate" value={diskUsage} sx={{ flexGrow: 1, height: 10 }} color="success" />
        <Typography variant="body2" sx={{ ml: 2 }}>{diskUsage.toFixed(1)}%</Typography>
      </ProgressBarContainer>

      <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
        Last updated: {new Date(timestamp).toLocaleTimeString()}
      </Typography>
    </StyledPaper>
  );
};

export default SystemHealth;