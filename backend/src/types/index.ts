import { Model, Optional } from 'sequelize';
import { Request } from 'express';

export interface IUser {
  id?: number | string; // Changed to allow both number (Sequelize) and string/ObjectId (Mongoose)
  username: string;
  email: string;
  password_hash?: string; // Changed from password to password_hash
  created_at?: Date; // Changed from createdAt to created_at
  updated_at?: Date; // Changed from updatedAt to updated_at
}

export interface UserCreationAttributes extends Optional<IUser, 'id' | 'created_at' | 'updated_at'> {}

export interface UserInstance extends Model<IUser, UserCreationAttributes>, IUser {}

export interface IProject {
  id?: number;
  user_id: number; // Changed from userId to user_id
  name: string;
  description?: string;
  settings?: object; // Added settings field
  status?: string; // Added status field
  created_at?: Date; // Changed from createdAt to created_at
  updated_at?: Date; // Changed from updatedAt to updated_at
}

export interface ProjectCreationAttributes extends Optional<IProject, 'id' | 'settings' | 'status' | 'created_at' | 'updated_at'> {}

export interface ProjectInstance extends Model<IProject, ProjectCreationAttributes>, IProject {}

export interface IScraper {
  id?: number;
  project_id: number; // Changed from projectId to project_id
  name: string;
  url: string;
  selectors?: object;
  pagination_config?: object;
  browser_config?: object;
  schedule_config?: object;
  rate_limit?: number;
  enabled?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ScraperCreationAttributes extends Optional<IScraper, 'id' | 'url' | 'selectors' | 'pagination_config' | 'browser_config' | 'schedule_config' | 'rate_limit' | 'enabled' | 'created_at' | 'updated_at'> {}

export interface ScraperInstance extends Model<IScraper, ScraperCreationAttributes>, IScraper {}

export interface IJob {
  id?: number;
  scraper_id: number;
  status: string;
  started_at?: Date;
  completed_at?: Date;
  records_scraped?: number;
  pages_processed?: number;
  error_message?: string;
  execution_log?: string;
  configuration_snapshot?: object;
}

export interface JobCreationAttributes extends Optional<IJob, 'id' | 'status' | 'started_at' | 'completed_at' | 'records_scraped' | 'pages_processed' | 'error_message' | 'execution_log' | 'configuration_snapshot'> {}

export interface JobInstance extends Model<IJob, JobCreationAttributes>, IJob {}

export interface AuthRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export interface ProjectRequest {
  name: string;
  description?: string;
}

export interface ScraperRequest {
  name?: string;
  url?: string;
  selectors?: object;
  pagination_config?: object;
  browser_config?: object;
  schedule_config?: object;
  rate_limit?: number;
  enabled?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  headers: {
    authorization?: string;
  } & Request['headers'];
  body: any; // Allow any type for body for now, will refine later if needed
  params: {
    id?: string; // Allow id parameter for now, will refine later if needed
  } & Request['params'];
} // Added semicolon here

export interface IScrapedData {
 id?: number;
 scraper_id: number;
 project_id: number;
 source_url: string; // Added
 page_number?: number; // Added
 extraction_timestamp?: Date; // Added
 data: object; // JSON field for scraped data
 validation_score?: number;
 is_duplicate?: boolean;
 metadata?: object; // Added
 created_at?: Date;
 updated_at?: Date;
}

export interface ScrapedDataCreationAttributes extends Optional<IScrapedData, 'id' | 'validation_score' | 'is_duplicate' | 'created_at' | 'updated_at'> {}

export interface ScrapedDataInstance extends Model<IScrapedData, ScrapedDataCreationAttributes>, IScrapedData {}

export interface ValidationResult {
 isValid: boolean;
 errors: ValidationError[];
 qualityScore: number;
 validatedData: any;
}

export interface ValidationError {
 field: string;
 message: string;
}

export interface QueryOptions {
 page?: number;
 limit?: number;
 sortBy?: string;
 sortOrder?: 'asc' | 'desc';
 groupBy?: string;
 aggregation?: {
   field: string;
   type: 'count' | 'sum' | 'avg';
 };
}

export interface ExportOptions {
 fields?: string[]; // Custom field mapping/selection for CSV/Excel
}
