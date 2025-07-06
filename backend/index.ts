import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import scraperRoutes from './routes/scrapers';

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', scraperRoutes);

app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
}

export default app;
