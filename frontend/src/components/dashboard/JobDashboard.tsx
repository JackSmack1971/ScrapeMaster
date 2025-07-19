import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { NotificationService } from '../../services/NotificationService';
import JobProgressCard from './JobProgressCard';
import MetricsChart from './MetricsChart';
import JobQueue from './JobQueue';
import SystemHealth from './SystemHealth';

interface WebSocketMessage {
  event: string;
  data: any;
}

const JobDashboard: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [jobData, setJobData] = useState<Map<string, any>>(new Map()); // Map to store job data by jobId
  const [systemHealth, setSystemHealth] = useState<any>(null); // To store real-time system health
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]); // To store historical metrics for charts

  // Mock functions for job control - these would interact with your backend API
  const handleJobControl = useCallback((jobId: string, action: string, value?: any) => {
    console.log(`Job ${jobId}: ${action} with value ${value}`);
    // Here you would send an API request to your backend to control the job
    NotificationService.showInfo(`Attempting to ${action} job ${jobId}`);
  }, []);

  useEffect(() => {
    // Establish WebSocket connection
    // IMPORTANT: Replace YOUR_AUTH_TOKEN with a dynamic token from your authentication system
    const authToken = localStorage.getItem('authToken'); // Example: get token from localStorage
    const ws = new WebSocket(`ws://localhost:5000?token=${authToken}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      NotificationService.showInfo('Connected to real-time job updates.');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);

      switch (message.event) {
        case 'job:start':
        case 'job:progress':
        case 'job:end':
        case 'job:error':
          setJobData(prev => {
            const newJobData = new Map(prev);
            newJobData.set(message.data.jobId, { ...newJobData.get(message.data.jobId), ...message.data });
            return newJobData;
          });
          NotificationService.showJobNotification(message.event, message.data);

          // For metrics chart, add relevant data
          if (message.event === 'job:progress' || message.event === 'job:end') {
            setMetricsHistory(prev => [...prev, {
              timestamp: Date.now(),
              recordsProcessed: message.data.recordsProcessed,
              pagesProcessed: message.data.pagesProcessed,
            }]);
          }
          break;
        case 'system:health':
          setSystemHealth(message.data);
          break;
        default:
          console.log('Unknown event:', message.event);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      NotificationService.showError('Disconnected from real-time job updates.');
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      NotificationService.showError('WebSocket connection error.');
    };

    return () => {
      ws.close();
    };
  }, []);

  const activeJobs = Array.from(jobData.values()).filter(job =>
    job.status === 'running' || job.status === 'pending'
  );

  const queuedJobs = activeJobs.filter(job => job.status === 'pending');
  const runningJobs = activeJobs.filter(job => job.status === 'running');

  // Prepare data for MetricsChart - example for total records processed over time
  const totalRecordsProcessedData = metricsHistory.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    records: item.recordsProcessed,
  }));

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        ScrapeMaster Pro Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Live Job Progress Cards */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Live Job Progress</Typography>
            {activeJobs.length === 0 ? (
              <Typography>No active jobs to display.</Typography>
            ) : (
              <Grid container spacing={2}>
                {activeJobs.map((job) => (
                  <Grid item xs={12} sm={6} md={4} key={job.jobId}>
                    <JobProgressCard {...job} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Performance Metrics Chart */}
        <Grid item xs={12} md={6}>
          <MetricsChart
            title="Total Records Processed Over Time"
            data={totalRecordsProcessedData}
            xKey="time"
            yKey="records"
            lineColor="#82ca9d"
          />
        </Grid>

        {/* Job Queue Management */}
        <Grid item xs={12} md={6}>
          <JobQueue
            queuedJobs={queuedJobs}
            runningJobs={runningJobs}
            onStartJob={(id) => handleJobControl(id, 'start')}
            onStopJob={(id) => handleJobControl(id, 'stop')}
            onPauseJob={(id) => handleJobControl(id, 'pause')}
            onResumeJob={(id) => handleJobControl(id, 'resume')}
            onCancelJob={(id) => handleJobControl(id, 'cancel')}
            onRetryJob={(id) => handleJobControl(id, 'retry')}
            onAdjustPriority={(id, priority) => handleJobControl(id, 'adjust_priority', priority)}
          />
        </Grid>

        {/* System Health Indicators */}
        <Grid item xs={12}>
          {systemHealth && (
            <SystemHealth
              cpuUsage={systemHealth.cpuUsage}
              memoryUsage={systemHealth.memoryUsage}
              diskUsage={systemHealth.diskUsage}
              timestamp={systemHealth.timestamp}
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default JobDashboard;