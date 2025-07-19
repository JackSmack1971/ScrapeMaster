import React from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, Divider, Button } from '@mui/material';

interface JobQueueProps {
  queuedJobs: any[]; // Array of jobs in the queue
  runningJobs: any[]; // Array of currently running jobs
  onStartJob?: (jobId: string) => void;
  onStopJob?: (jobId: string) => void;
  onPauseJob?: (jobId: string) => void;
  onResumeJob?: (jobId: string) => void;
  onCancelJob?: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
  onAdjustPriority?: (jobId: string, priority: number) => void;
}

const JobQueue: React.FC<JobQueueProps> = ({
  queuedJobs,
  runningJobs,
  onStartJob,
  onStopJob,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  onRetryJob,
  onAdjustPriority,
}) => {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>Job Queue Management</Typography>
      <Box mb={2}>
        <Typography variant="subtitle1">Running Jobs ({runningJobs.length})</Typography>
        <List dense>
          {runningJobs.length === 0 ? (
            <ListItem><ListItemText secondary="No jobs currently running." /></ListItem>
          ) : (
            runningJobs.map(job => (
              <ListItem key={job.id} secondaryAction={
                <Box>
                  <Button size="small" onClick={() => onStopJob && onStopJob(job.id)}>Stop</Button>
                  <Button size="small" onClick={() => onPauseJob && onPauseJob(job.id)}>Pause</Button>
                  <Button size="small" onClick={() => onCancelJob && onCancelJob(job.id)}>Cancel</Button>
                </Box>
              }>
                <ListItemText
                  primary={`Job ID: ${job.id} - Scraper: ${job.scraperName}`}
                  secondary={`Status: ${job.status} | Progress: ${job.progress}%`}
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box>
        <Typography variant="subtitle1">Queued Jobs ({queuedJobs.length})</Typography>
        <List dense>
          {queuedJobs.length === 0 ? (
            <ListItem><ListItemText secondary="No jobs in queue." /></ListItem>
          ) : (
            queuedJobs.map(job => (
              <ListItem key={job.id} secondaryAction={
                <Box>
                  <Button size="small" onClick={() => onStartJob && onStartJob(job.id)}>Start</Button>
                  <Button size="small" onClick={() => onCancelJob && onCancelJob(job.id)}>Cancel</Button>
                  <Button size="small" onClick={() => onAdjustPriority && onAdjustPriority(job.id, job.priority + 1)}>Increase Priority</Button>
                </Box>
              }>
                <ListItemText
                  primary={`Job ID: ${job.id} - Scraper: ${job.scraperName}`}
                  secondary={`Status: ${job.status} | Priority: ${job.priority}`}
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box>
        <Typography variant="subtitle1">Failed/Completed Jobs (Placeholder)</Typography>
        <List dense>
          <ListItem><ListItemText secondary="List of failed/completed jobs with retry options will go here." /></ListItem>
          <ListItem secondaryAction={
            <Button size="small" onClick={() => onRetryJob && onRetryJob('someFailedJobId')}>Retry</Button>
          }>
            <ListItemText primary="Example Failed Job ID: someFailedJobId" secondary="Error: Network timeout" />
          </ListItem>
        </List>
      </Box>
    </Paper>
  );
};

export default JobQueue;