import { Transform, Readable } from 'stream';
import * as ExcelJS from 'exceljs';
import { create } from 'xmlbuilder2';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import DataTransformer from './DataTransformer'; // Import DataTransformer

interface ExportOptions {
    format: 'csv' | 'json' | 'excel' | 'xml';
    fieldMapping?: { [key: string]: string }; // { originalField: newFieldName }
    transformations?: any[]; // To be defined by DataTransformer
    onProgress?: (progress: number) => void;
}

class ExportEngine {
    async exportData(data: NodeJS.ReadableStream, options: ExportOptions): Promise<NodeJS.ReadableStream> {
        const { format, fieldMapping, transformations, onProgress } = options;

        let recordCount = 0;
        const transformStream = new Transform({
            objectMode: true,
            transform(chunk: { [key: string]: any }, encoding, callback) {
                recordCount++;
                // Apply field mapping
                let processedChunk: { [key: string]: any } = chunk;
                if (fieldMapping) {
                    processedChunk = Object.keys(fieldMapping).reduce((acc: { [key: string]: any }, key) => {
                        if (processedChunk[key] !== undefined) {
                            acc[fieldMapping[key]] = processedChunk[key];
                        }
                        return acc;
                    }, {});
                }

                // Apply transformations
                if (transformations && transformations.length > 0) {
                    processedChunk = DataTransformer.applyTransformations(processedChunk, transformations);
                }

                this.push(processedChunk);
                if (onProgress) {
                    // This is a simplified progress. Real progress would need total record count.
                    onProgress(recordCount);
                }
                callback();
            },
        });

        let finalStream: NodeJS.ReadableStream = data.pipe(transformStream);

        // Placeholder for format-specific conversion
        switch (format) {
            case 'csv':
                // Implement CSV conversion logic
                finalStream = finalStream.pipe(this.convertToCsvStream());
                break;
            case 'json':
                // Implement JSON conversion logic (e.g., array of JSON objects or line-delimited JSON)
                finalStream = finalStream.pipe(this.convertToJsonStream());
                break;
            case 'excel':
                // Implement Excel conversion logic (requires a library like 'exceljs')
                finalStream = finalStream.pipe(this.convertToExcelStream());
                break;
            case 'xml':
                // Implement XML conversion logic
                finalStream = finalStream.pipe(this.convertToXmlStream());
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
        return finalStream;
    }

    private convertToCsvStream(): NodeJS.ReadWriteStream {
        // Basic CSV conversion. A proper implementation would handle headers, escaping, etc.
        let isFirstChunk = true;
        return new Transform({
            objectMode: true,
            transform(chunk: { [key: string]: any }, encoding, callback) {
                if (isFirstChunk) {
                    this.push(Object.keys(chunk).join(',') + '\n');
                    isFirstChunk = false;
                }
                this.push(Object.values(chunk).map(value => {
                    // Basic CSV escaping for values containing commas or newlines
                    if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',') + '\n');
                callback();
            }
        });
    }

    private convertToJsonStream(): NodeJS.ReadWriteStream {
        // Converts objects to line-delimited JSON
        return new Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                this.push(JSON.stringify(chunk) + '\n');
                callback();
            }
        });
    }

    private convertToExcelStream(): NodeJS.ReadWriteStream {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');
        let isFirstChunk = true;

        return new Transform({
            objectMode: true,
            transform(chunk: { [key: string]: any }, encoding, callback) {
                if (isFirstChunk) {
                    worksheet.columns = Object.keys(chunk).map(key => ({ header: key, key: key, width: 20 }));
                    isFirstChunk = false;
                }
                worksheet.addRow(chunk);
                callback();
            },
            flush(callback) {
                workbook.xlsx.write(this)
                    .then(() => callback())
                    .catch(err => callback(err));
            }
        });
    }

    private convertToXmlStream(): NodeJS.ReadWriteStream {
        let rootElement: any;
        return new Transform({
            objectMode: true,
            transform(chunk: { [key: string]: any }, encoding, callback) {
                if (!rootElement) {
                    rootElement = create({ version: '1.0', encoding: 'UTF-8' }).ele('data');
                }
                const recordElement = rootElement.ele('record');
                for (const key in chunk) {
                    recordElement.ele(key).txt(String(chunk[key]));
                }
                this.push(recordElement.end({ prettyPrint: true })); // Push each record as a separate XML string
                callback();
            },
            flush(callback) {
                // If there's a root element, finalize it. This might be needed if no data was pushed in transform.
                if (rootElement) {
                     this.push(rootElement.end({ prettyPrint: true }));
                }
                callback();
            }
        });
    }
}
 
export default ExportEngine;