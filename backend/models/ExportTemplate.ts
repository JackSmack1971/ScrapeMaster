import mongoose, { Document, Schema } from 'mongoose';

export interface IExportTemplate extends Document {
    name: string;
    description?: string;
    userId: mongoose.Types.ObjectId;
    format: 'csv' | 'json' | 'excel' | 'xml';
    fieldMapping?: { [key: string]: string };
    transformations?: any[]; // Array of transformation objects
    createdAt: Date;
    updatedAt: Date;
}

const ExportTemplateSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    format: { type: String, required: true, enum: ['csv', 'json', 'excel', 'xml'] },
    fieldMapping: { type: Map, of: String },
    transformations: { type: Array, default: [] },
}, { timestamps: true });

const ExportTemplate = mongoose.model<IExportTemplate>('ExportTemplate', ExportTemplateSchema);

export default ExportTemplate;