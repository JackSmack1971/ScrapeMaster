import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Typography, Container, Box } from '@mui/material';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
    // You could also log to a service here, e.g., Sentry, Bugsnag
    // logErrorToService(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Container component="main" maxWidth="md" sx={{ mt: 8, mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80vh',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" component="h1" gutterBottom>
              Oops! Something went wrong.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We're sorry, but an unexpected error occurred. Please try refreshing the page.
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 4, textAlign: 'left', bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                  <Typography variant="h6" color="error">Error Details (Development Only):</Typography>
                  <Typography variant="body2" component="pre" sx={{ overflowX: 'auto' }}>
                    {this.state.error?.toString()}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Box>
              )}
            </Typography>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;