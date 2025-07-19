import React from 'react';
import { Paper, Typography, LinearProgress, Box, Chip } from '@mui/material';
import { styled } from '@mui/system';

interface JobProgressCardProps {
  jobId: string;
  status: string;
  progress?: number; // Percentage completion
  recordsProcessed?: number;
  pagesProcessed?: number;
  errorCount?: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor:
    status === 'completed'
      ? theme.palette.success.main
      : status === 'running'
      ? theme.palette.info.main
      : status === 'failed'
      ? theme.palette.error.main
      : theme.palette.warning.main,
  color: theme.palette.common.white,
  fontWeight: 'bold',
}));

const JobProgressCard: React.FC<JobProgressCardProps> = ({
  jobId,
  status,
  progress = 0,
  recordsProcessed = 0,
  pagesProcessed = 0,
  errorCount = 0,
  startTime,
  endTime,
  duration,
}) => {
  const displayStatus = status.replace(/_/g, ' '); // Replace underscores with spaces

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours > 0 ? `${hours}h ` : ''}${minutes % 60}m ${seconds % 60}s`;
  };

  return (
    <StyledPaper elevation={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Job ID: {jobId}
        </Typography>
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="body2" sx={{ mr: 1 }}>Status:</Typography>
          <StatusChip label={displayStatus} size="small" status={status} />
        </Box>

        <Typography variant="body2">Records Processed: {recordsProcessed}</Typography>
        <Typography variant="body2">Pages Processed: {pagesProcessed}</Typography>
        {errorCount > 0 && (
          <Typography variant="body2" color="error">Errors: {errorCount}</Typography>
        )}
        {startTime && (
          <Typography variant="body2">Started: {new Date(startTime).toLocaleTimeString()}</Typography>
        )}
        {endTime && (
          <Typography variant="body2">Completed: {new Date(endTime).toLocaleTimeString()}</Typography>
        )}
        {duration !== undefined && (
          <Typography variant="body2">Duration: {formatDuration(duration)}</Typography>
        )}
      </Box>
      <Box sx={{ width: '100%', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">{`Progress: ${Math.round(progress)}%`}</Typography>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
    </StyledPaper>
  );
};

export default JobProgressCard;