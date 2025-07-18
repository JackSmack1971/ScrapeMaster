import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ExportEngine from './ExportEngine';
import ExportTemplate, { IExportTemplate } from '../../models/ExportTemplate';
import Export, { IExport } from '../../models/Export';
import { Readable } from 'stream';

const EXPORT_DIR = 'exports'; // Directory to store exported files

class ExportService {
    private exportEngine: ExportEngine;

    constructor() {
        this.exportEngine = new ExportEngine();
        this.ensureExportDirectoryExists();
    }

    private ensureExportDirectoryExists() {
        if (!existsSync(EXPORT_DIR)) {
            mkdirSync(EXPORT_DIR);
        }
    }

    async createExport(
        userId: string,
        projectId: string,
        format: 'csv' | 'json' | 'excel' | 'xml',
        dataStream: Readable, // Assuming dataStream is a Node.js Readable stream of records
        fieldMapping?: { [key: string]: string },
        transformations?: any[]
    ): Promise<IExport> {
        const exportId = uuidv4();
        const outputFileName = `${exportId}.${format}`;
        const outputPath = `${EXPORT_DIR}/${outputFileName}`;

        const newExport = new Export({
            userId,
            projectId,
            exportId,
            format,
            status: 'in-progress',
            progress: 0,
            recordCount: 0,
            fileSize: 0,
        });
        await newExport.save();

        let processedRecordCount = 0;
        const onProgress = async (count: number) => {
            processedRecordCount = count;
            // Update progress in DB periodically to avoid excessive writes
            if (count % 100 === 0) { // Update every 100 records
                await Export.updateOne({ exportId }, { progress: Math.min(100, (count / 100000) * 100) }); // Placeholder for actual progress calculation
            }
        };

        try {
            const exportStream = await this.exportEngine.exportData(dataStream, {
                format,
                fieldMapping,
                transformations,
                onProgress,
            });

            const writeStream = createWriteStream(outputPath);

            exportStream.pipe(writeStream);

            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            const stats = statSync(outputPath);
            await Export.updateOne(
                { exportId },
                {
                    status: 'completed',
                    filePath: outputPath,
                    recordCount: processedRecordCount,
                    fileSize: stats.size,
                    progress: 100,
                }
            );
            return newExport;
        } catch (error: any) {
            console.error(`Error during export ${exportId}:`, error);
            await Export.updateOne(
                { exportId },
                {
                    status: 'failed',
                    error: error.message,
                    progress: 100,
                }
            );
            throw error;
        }
    }

    async getExportProgress(exportId: string): Promise<IExport | null> {
        return Export.findOne({ exportId });
    }

    async getExportDownloadPath(exportId: string): Promise<string | null> {
        const exportJob = await Export.findOne({ exportId });
        if (exportJob && exportJob.status === 'completed' && exportJob.filePath) {
            return exportJob.filePath;
        }
        return null;
    }

    async saveExportTemplate(
        userId: string,
        templateData: {
            name: string;
            description?: string;
            format: 'csv' | 'json' | 'excel' | 'xml';
            fieldMapping?: { [key: string]: string };
            transformations?: any[];
        }
    ): Promise<IExportTemplate> {
        const newTemplate = new ExportTemplate({
            ...templateData,
            userId,
        });
        await newTemplate.save();
        return newTemplate;
    }

    async getExportTemplate(templateId: string): Promise<IExportTemplate | null> {
        return ExportTemplate.findById(templateId);
    }

    async listExportTemplates(userId: string): Promise<IExportTemplate[]> {
        return ExportTemplate.find({ userId });
    }
}

export default ExportService;