export interface ScraperAttributes {
  id?: number;
  project_id: number;
  name: string;
  start_url: string;
  scrape_interval_minutes?: number;
  last_scrape_time?: Date;
  next_scrape_time?: Date;
  status?: string;
  configuration: any; // JSON object for scraper configuration
  created_at?: Date;
  updated_at?: Date;
}