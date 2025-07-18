export interface ScrapedDataAttributes {
  id?: number;
  job_id: number;
  scraper_id: number;
  source_url: string;
  data: any; // This will hold the actual scraped JSON data
  page_number?: number;
  extraction_timestamp?: Date;
  data_hash?: string;
  validation_score?: number;
  is_duplicate?: boolean;
  metadata?: any;
}