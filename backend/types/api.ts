export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
}

export interface Scraper {
  id: string;
  projectId: string;
  name: string;
  config: object;
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}
