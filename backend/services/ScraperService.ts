import { v4 as uuid } from 'uuid';
import { Scraper } from '../types/api';

const scrapers: Scraper[] = [];

export class ScraperService {
  static list(projectId: string): Scraper[] {
    return scrapers.filter(s => s.projectId === projectId);
  }

  static create(projectId: string, name: string, config: object): Scraper {
    const scraper: Scraper = { id: uuid(), projectId, name, config };
    scrapers.push(scraper);
    return scraper;
  }

  static get(id: string): Scraper | undefined {
    return scrapers.find(s => s.id === id);
  }

  static update(id: string, name: string, config: object): Scraper | undefined {
    const scraper = this.get(id);
    if (!scraper) return undefined;
    scraper.name = name;
    scraper.config = config;
    return scraper;
  }

  static delete(id: string): boolean {
    const idx = scrapers.findIndex(s => s.id === id);
    if (idx === -1) return false;
    scrapers.splice(idx, 1);
    return true;
  }
}
