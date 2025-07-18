import { Router, Response, NextFunction } from 'express';
import ExportService from '../services/ExportService';
import { protect } from '../middleware/authMiddleware'; // Corrected import name
import { AuthenticatedRequest } from '../types'; // Import AuthenticatedRequest
import { Readable } from 'stream'; // Import Readable
import asyncHandler from 'express-async-handler'; // Import asyncHandler

const router = Router();
const exportService = new ExportService();

// POST /api/exports - Create new export
router.post('/exports', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, format, fieldMapping, transformations, data } = req.body;
    const userId = req.user?.id?.toString(); // Convert userId to string

    if (!userId || !projectId || !format || !data) {
        res.status(400);
        throw new Error('Missing required export parameters.');
    }

    // 'data' in req.body is a placeholder. In a real scenario, data would be streamed from a source
    // like a database query result. For demonstration, we'll convert it to a Readable stream.
    const dataStream = new Readable({
        objectMode: true,
        read() {
            data.forEach((record: any) => this.push(record));
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
}));

// GET /api/exports/:id/progress - Check export progress
router.get('/exports/:exportId/progress', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { exportId } = req.params;
    const exportJob = await exportService.getExportProgress(exportId);
    if (!exportJob) {
        res.status(404);
        throw new Error('Export job not found');
    }
    res.status(200).json({
        exportId: exportJob.exportId,
        status: exportJob.status,
        progress: exportJob.progress,
        recordCount: exportJob.recordCount,
        fileSize: exportJob.fileSize,
        filePath: exportJob.filePath,
        error: exportJob.error,
    });
}));

// GET /api/exports/:id/download - Download completed export
router.get('/exports/:exportId/download', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { exportId } = req.params;
    const filePath = await exportService.getExportDownloadPath(exportId);

    if (!filePath) {
        res.status(404);
        throw new Error('Export file not found or not yet completed');
    }

    // Ensure the file exists before sending
    // In a real app, you might want to add more robust file serving (e.g., streaming large files)
    res.download(filePath, (err) => {
        if (err) {
            console.error(`Error downloading file ${filePath}:`, err);
            res.status(500).json({ message: 'Failed to download file' });
        }
    });
}));

// POST /api/exports/templates - Save export template
router.post('/exports/templates', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, format, fieldMapping, transformations } = req.body;
    const userId = req.user?.id?.toString(); // Convert userId to string

    if (!userId || !name || !format) {
        res.status(400);
        throw new Error('Missing required template parameters.');
    }

    const template = await exportService.saveExportTemplate(userId, {
        name,
        description,
        format,
        fieldMapping,
        transformations,
    });
    res.status(201).json({ message: 'Export template saved', templateId: template._id });
}));

// GET /api/exports/templates - List export templates
router.get('/exports/templates', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id?.toString(); // Convert userId to string
    if (!userId) {
        res.status(401);
        throw new Error('Unauthorized');
    }
    const templates = await exportService.listExportTemplates(userId);
    res.status(200).json(templates);
}));

// GET /api/exports/templates/:id - Get a specific export template
router.get('/exports/templates/:templateId', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { templateId } = req.params;
    const template = await exportService.getExportTemplate(templateId);
    if (!template) {
        res.status(404);
        throw new Error('Export template not found');
    }
    // Ensure the template belongs to the requesting user
    if (template.userId.toString() !== req.user?.id?.toString()) { // Compare string representations
        res.status(403);
        throw new Error('Forbidden');
    }
    res.status(200).json(template);
}));

export default router;