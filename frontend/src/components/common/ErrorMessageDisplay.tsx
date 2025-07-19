import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

interface ErrorMessageDisplayProps {
  title?: string;
  message: string | string[];
}

const ErrorMessageDisplay: React.FC<ErrorMessageDisplayProps> = ({
  title = 'Error',
  message,
}) => {
  const messages = Array.isArray(message) ? message : [message];

  return (
    <Box sx={{ width: '100%', my: 2 }}>
      <Alert severity="error">
        <AlertTitle>{title}</AlertTitle>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </Alert>
    </Box>
  );
};

export default ErrorMessageDisplay;