import React from 'react';
import { Box, Skeleton } from '@mui/material';

interface ContentSkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  count?: number;
}

const ContentSkeleton: React.FC<ContentSkeletonProps> = ({
  variant = 'rectangular',
  width = '100%',
  height = 40,
  count = 1,
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      {Array.from(new Array(count)).map((_, index) => (
        <Skeleton
          key={index}
          variant={variant}
          width={width}
          height={height}
          sx={{ mb: 1 }}
        />
      ))}
    </Box>
  );
};

export default ContentSkeleton;