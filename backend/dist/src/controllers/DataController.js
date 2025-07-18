"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportScrapedData = exports.getScrapedData = exports.ingestScrapedData = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler")); // Import asyncHandler
const DataStorageService_1 = __importDefault(require("../services/DataStorageService"));
const DuplicateDetector_1 = __importDefault(require("../services/DuplicateDetector"));
const DataValidator_1 = __importDefault(require("../services/DataValidator"));
const DataQueryService_1 = __importDefault(require("../services/DataQueryService"));
const ExportService_1 = __importDefault(require("../services/ExportService"));
const ScrapedData_1 = __importDefault(require("../../models/ScrapedData")); // Import the Sequelize model
const dataStorageService = new DataStorageService_1.default();
const duplicateDetector = new DuplicateDetector_1.default();
const dataValidator = new DataValidator_1.default();
const dataQueryService = new DataQueryService_1.default();
const exportService = new ExportService_1.default();
exports.ingestScrapedData = (0, express_async_handler_1.default)(async (req, res) => {
    const { data, scraper_id, project_id, source_url, page_number, extraction_timestamp, metadata } = req.body;
    // 1. Validate data
    // Assuming a schema is passed or retrieved for the specific scraper/project
    // For now, a basic schema for demonstration
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
    const existingData = await ScrapedData_1.default.findAll({
        where: { scraper_id, project_id }
    });
    // Access raw data values from Sequelize model instances
    const isDuplicate = await duplicateDetector.isDuplicate(data, existingData.map(d => d.get('data')));
    const newScrapedData = {
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
exports.getScrapedData = (0, express_async_handler_1.default)(async (req, res) => {
    const { filters, search, page, limit, sortBy, sortOrder, groupBy, aggregation } = req.query;
    const queryOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
        groupBy: groupBy,
        aggregation: aggregation ? JSON.parse(aggregation) : undefined
    };
    const data = await dataQueryService.queryData(filters, search, queryOptions);
    res.status(200).json(data);
});
exports.exportScrapedData = (0, express_async_handler_1.default)(async (req, res) => {
    const { format, outputPath, fields } = req.body; // outputPath might be client-side, or we return a stream
    // In a real scenario, you might query data first based on filters before exporting
    const dataToExport = await ScrapedData_1.default.findAll(); // Example: fetch all data
    await exportService.exportData(dataToExport.map(d => d.get('data')), format, outputPath, { fields });
    res.status(200).json({ message: 'Export initiated successfully' });
});
