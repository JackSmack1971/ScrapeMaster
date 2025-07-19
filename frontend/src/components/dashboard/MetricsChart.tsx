import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface MetricsChartProps {
  data: any[]; // Array of data points for the chart
  title: string;
  xKey: string; // Key for the X-axis (e.g., 'timestamp')
  yKey: string; // Key for the Y-axis (e.g., 'recordsProcessed' or 'pagesProcessed')
  lineColor?: string;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ data, title, xKey, yKey, lineColor = '#8884d8' }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5, right: 30, left: 20, bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke={lineColor} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default MetricsChart;