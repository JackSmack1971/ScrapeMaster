// DataController.ts
import { Response } from 'express';
import asyncHandler from 'express-async-handler'; // Import asyncHandler
import { Readable } from 'stream'; // Import Readable
import DataStorageService from '../services/DataStorageService';
import DuplicateDetector from '../services/DuplicateDetector';
import DataValidator from '../services/DataValidator';
import DataQueryService from '../services/DataQueryService';
import ExportService from '../services/ExportService';
import DataProcessor from '../services/DataProcessor'; // Import DataProcessor
import { IScrapedData, QueryOptions, AuthenticatedRequest } from '../types'; // Import AuthenticatedRequest
import ScrapedData from '../../models/ScrapedData'; // Import the Sequelize model

const dataStorageService = new DataStorageService();
const duplicateDetector = new DuplicateDetector();
const dataValidator = new DataValidator();
const dataQueryService = new DataQueryService();
const exportService = new ExportService();
const dataProcessor = new DataProcessor(); // Instantiate DataProcessor

export const ingestScrapedData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { data, scraper_id, project_id, source_url, page_number, extraction_timestamp, metadata } = req.body;

    // 1. Validate data
    const schema = {
        type: 'object',
        properties: {
            title: { type: 'string', required: true },
            price: { type: 'number', format: 'float' },
            url: { type: 'string', format: 'uri' }
        },
        required: ['title']
    };
    const validationResult = await dataValidator.validate(data, schema);

    if (!validationResult.isValid) {
        res.status(400);
        throw new Error(`Data validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // 2. Check for duplicates
    const existingData = await ScrapedData.findAll({
        where: { scraper_id, project_id }
    });
    const isDuplicate = await duplicateDetector.isDuplicate(data, existingData.map(d => d.get('data')));

    const newScrapedData: IScrapedData = {
        scraper_id,
        project_id,
        source_url,
        page_number,
        extraction_timestamp,
        data: validationResult.validatedData,
        validation_score: validationResult.qualityScore,
        is_duplicate: isDuplicate,
        metadata
    };

    // 3. Store data
    await dataStorageService.insertBatch([newScrapedData]);

    res.status(201).json({ message: 'Data ingested successfully', data: newScrapedData });
});

export const getScrapedData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filters, search, page, limit, sortBy, sortOrder, groupBy, aggregation } = req.query;

    const queryOptions: QueryOptions = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        groupBy: groupBy as string,
        aggregation: aggregation ? JSON.parse(aggregation as string) : undefined
    };

    const data = await dataQueryService.queryData(filters, search as string, queryOptions);
    res.status(200).json(data);
});

export const exportScrapedData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, format, fieldMapping, transformations } = req.body;
    const userId = req.user?.id?.toString();

    if (!userId || !projectId || !format) {
        res.status(400);
        throw new Error('Missing required export parameters.');
    }

    // Fetch data for the given project_id and convert to a Readable stream
    const scrapedDataRecords = await ScrapedData.findAll({
        where: { project_id: parseInt(projectId as string) },
    });

    const dataStream = new Readable({
        objectMode: true,
        read() {
            scrapedDataRecords.map(d => d.get('data')).forEach((record: any) => this.push(record));
            this.push(null);
        }
    });

    const exportJob = await exportService.createExport(
        userId,
        projectId,
        format,
        dataStream,
        fieldMapping,
        transformations
    );
    res.status(202).json({ message: 'Export initiated', exportId: exportJob.exportId });
});

export const getAnalysisReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { project_id } = req.params; // project_id from URL params
    const userId = req.user?.id;

    if (!userId) {
        res.status(401);
        throw new Error('Unauthorized: User ID not found.');
    }

    if (!project_id) {
        res.status(400);
        throw new Error('Missing project ID.');
    }

    const scrapedDataRecords = await ScrapedData.findAll({
        where: { project_id: parseInt(project_id as string) },
    });

    if (!scrapedDataRecords || scrapedDataRecords.length === 0) {
        res.status(404).json({ message: 'No scraped data found for this project.' });
        return;
    }

    const rawData = scrapedDataRecords.map(record => record.get('data'));

    const statisticalSummary = dataProcessor.getStatisticalSummary(rawData);
    const dataQualityReport = dataProcessor.getDataQualityReport(rawData);
    const duplicateDetectionReport = dataProcessor.getDuplicateDetectionReport(rawData);

    res.status(200).json({
        statisticalSummary,
        dataQualityReport,
        duplicateDetectionReport,
    });
});