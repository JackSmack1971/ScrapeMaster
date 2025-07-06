# Frontend Component Development Guide

## Component Architecture Guidelines

### Component Organization
```
/src/components/
  /common/              # Reusable UI components
    /Button/
    /Modal/
    /DataTable/
  /scraper/             # Scraper configuration components
    /ScraperWizard/
    /SelectorBuilder/
    /PaginationConfig/
  /dashboard/           # Dashboard and monitoring
    /JobMonitor/
    /PerformanceCharts/
    /StatusIndicator/
  /export/              # Data export components
    /ExportWizard/
    /FormatSelector/
    /FieldMapper/
```

### Component Standards

#### Component Template
```typescript
import React, { useState, useEffect, memo, useCallback } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { ComponentProps, ValidationError } from '../../types';

interface ComponentNameProps {
  // Props should be explicitly typed
  data?: ComponentData;
  onAction: (result: ActionResult) => void;
  loading?: boolean;
  error?: ValidationError | null;
}

const ComponentName: React.FC<ComponentNameProps> = memo(({
  data,
  onAction,
  loading = false,
  error = null
}) => {
  // State management
  const [localState, setLocalState] = useState<LocalState>({});
  
  // Memoized callbacks for performance
  const handleAction = useCallback((event: Event) => {
    // Event handling logic
    onAction(result);
  }, [onAction]);

  // Effects with proper dependencies
  useEffect(() => {
    // Side effects
    return () => {
      // Cleanup
    };
  }, [dependency]);

  // Early returns for loading/error states
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert severity="error">
        {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" component="h2">
        Component Title
      </Typography>
      {/* Component content */}
    </Box>
  );
});

ComponentName.displayName = 'ComponentName';

export default ComponentName;
```

#### Required Component Features
- **TypeScript**: Strict typing with proper interfaces
- **Error Boundaries**: Handle errors gracefully with user feedback
- **Loading States**: Show appropriate loading indicators
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Responsive Design**: Mobile-first approach with Material-UI breakpoints
- **Performance**: Use React.memo, useMemo, useCallback appropriately

### State Management Patterns

#### Local State (useState)
Use for component-specific state that doesn't need to be shared:
```typescript
const [formData, setFormData] = useState<FormData>({
  url: '',
  selectors: {},
  options: {}
});
```

#### Global State (Zustand)
Use stores for shared application state:
```typescript
import { useScraperStore } from '../../stores/scraperStore';

const { scrapers, addScraper, updateScraper } = useScraperStore();
```

#### Form State
Use controlled components with validation:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(scraperSchema)
});
```

## Testing Frontend Components

### Unit Testing Template
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import ComponentName from './ComponentName';
import { createTestTheme } from '../../utils/testUtils';

const renderComponent = (props = {}) => {
  const defaultProps = {
    onAction: jest.fn(),
    ...props
  };

  return render(
    <ThemeProvider theme={createTestTheme()}>
      <ComponentName {...defaultProps} />
    </ThemeProvider>
  );
};

describe('ComponentName', () => {
  it('should render with required props', () => {
    renderComponent();
    expect(screen.getByText('Component Title')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const mockOnAction = jest.fn();
    renderComponent({ onAction: mockOnAction });

    const button = screen.getByRole('button', { name: /action/i });
    await userEvent.click(button);

    expect(mockOnAction).toHaveBeenCalledWith(expectedResult);
  });

  it('should display loading state', () => {
    renderComponent({ loading: true });
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const error = { message: 'Test error' };
    renderComponent({ error });
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
```

### E2E Testing Considerations
- Use `data-testid` attributes for reliable element selection
- Test complete user workflows, not individual components
- Focus on business-critical paths (scraper creation, data export)
- Mock external dependencies (APIs, file system)

## Styling and Theming

### Material-UI Theme Usage
```typescript
import { useTheme } from '@mui/material/styles';

const Component = () => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        [theme.breakpoints.down('md')]: {
          padding: theme.spacing(1)
        }
      }}
    >
      Content
    </Box>
  );
};
```

### Custom Styling Guidelines
- Use `sx` prop for component-specific styles
- Create reusable styled components for common patterns
- Follow Material Design guidelines for spacing and typography
- Ensure 4.5:1 contrast ratio for accessibility compliance

## Performance Optimization

### React Performance Best Practices
```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// Memoize event handlers
const handleChange = useCallback((value: string) => {
  onValueChange(value);
}, [onValueChange]);

// Memoize component renders
const MemoizedComponent = memo(Component, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});
```

### Large Dataset Handling
- Use virtual scrolling for tables with 1000+ rows
- Implement pagination for data displays
- Debounce search inputs and filters
- Lazy load heavy components and images

### Bundle Optimization
- Use dynamic imports for code splitting
- Implement route-based code splitting
- Optimize image assets and use appropriate formats
- Monitor bundle size with webpack-bundle-analyzer

## Accessibility Standards

### Required Accessibility Features
- **Semantic HTML**: Use proper heading hierarchy, landmarks, lists
- **ARIA Labels**: Provide labels for interactive elements
- **Keyboard Navigation**: All functionality accessible via keyboard
- **Screen Reader Support**: Proper alt text, labels, and descriptions
- **Color Contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Focus Management**: Visible focus indicators, logical tab order

### Accessibility Testing
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = renderComponent();
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Scraper-Specific Component Guidelines

### Selector Builder Components
- Provide visual feedback for selector validation
- Show live preview of selected elements when possible
- Include common selector patterns and examples
- Validate CSS selector syntax before submission
- Support both CSS selectors and XPath expressions

### Data Visualization Components
- Use Recharts for consistent chart styling
- Implement responsive chart containers
- Provide data export options for charts
- Include proper loading states for data fetching
- Handle empty data states gracefully

### Configuration Forms
- Use multi-step wizards for complex configurations
- Validate inputs in real-time with user feedback
- Provide helpful tooltips and examples
- Save form state to prevent data loss
- Include configuration import/export functionality

## Error Handling and User Feedback

### Error Display Patterns
```typescript
// Component-level error boundary
const ComponentWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <Component />
  </ErrorBoundary>
);

// User-friendly error messages
const getErrorMessage = (error: Error): string => {
  if (error.code === 'INVALID_SELECTOR') {
    return 'The CSS selector is invalid. Please check the syntax and try again.';
  }
  if (error.code === 'NETWORK_ERROR') {
    return 'Unable to connect to the website. Please check your internet connection.';
  }
  return 'An unexpected error occurred. Please try again.';
};
```

### Success Feedback
- Use Material-UI Snackbar for temporary notifications
- Provide progress indicators for long-running operations
- Show confirmation dialogs for destructive actions
- Include undo functionality where appropriate

## Integration with Backend APIs

### API Client Usage
```typescript
import { scraperApi } from '../../services/api';
import { useMutation, useQuery } from '@tanstack/react-query';

const useScraperData = (scraperId: string) => {
  return useQuery({
    queryKey: ['scraper', scraperId],
    queryFn: () => scraperApi.getScraper(scraperId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

const useCreateScraper = () => {
  return useMutation({
    mutationFn: scraperApi.createScraper,
    onSuccess: (data) => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    }
  });
};
```

### Real-time Updates
- Use WebSocket connections for live job progress
- Implement optimistic updates for better UX
- Handle connection failures gracefully
- Provide manual refresh options as fallback