import { Transform } from 'stream';

interface Transformation {
    field: string;
    type: 'rename' | 'convert' | 'custom' | 'aggregate';
    // For 'rename'
    newFieldName?: string;
    // For 'convert'
    targetType?: 'string' | 'number' | 'boolean' | 'date';
    format?: string; // e.g., 'YYYY-MM-DD' for dates, '0.00' for numbers
    // For 'custom'
    jsFunction?: string; // JavaScript function as a string
    // For 'aggregate'
    operation?: 'sum' | 'count' | 'avg' | 'min' | 'max';
    groupByField?: string;
}

class DataTransformer {
    // Applies a series of transformations to a single record
    static applyTransformations(record: { [key: string]: any }, transformations: Transformation[]): { [key: string]: any } {
        let transformedRecord = { ...record };

        for (const t of transformations) {
            const value = transformedRecord[t.field];

            switch (t.type) {
                case 'rename':
                    if (t.newFieldName && transformedRecord[t.field] !== undefined) {
                        transformedRecord[t.newFieldName] = transformedRecord[t.field];
                        delete transformedRecord[t.field];
                    }
                    break;
                case 'convert':
                    transformedRecord[t.field] = this.convertValue(value, t.targetType, t.format);
                    break;
                case 'custom':
                    if (t.jsFunction) {
                        try {
                            const customFunc = new Function('value', 'record', t.jsFunction);
                            transformedRecord[t.field] = customFunc(value, transformedRecord);
                        } catch (e) {
                            console.error(`Error executing custom JS function for field ${t.field}:`, e);
                            // Optionally, handle error by keeping original value or setting to null
                        }
                    }
                    break;
                // Aggregate operations are typically done on a stream/collection, not single records
                // This case would be handled differently, perhaps in a separate stream transformer
                case 'aggregate':
                    // Placeholder: Aggregation logic will be more complex and likely involve a separate stream or a final pass
                    break;
                default:
                    console.warn(`Unknown transformation type: ${t.type}`);
            }
        }
        return transformedRecord;
    }

    // Creates a Transform stream to apply transformations to a stream of records
    static createTransformationStream(transformations: Transformation[]): Transform {
        return new Transform({
            objectMode: true,
            transform(chunk: { [key: string]: any }, encoding, callback) {
                const transformedChunk = DataTransformer.applyTransformations(chunk, transformations);
                this.push(transformedChunk);
                callback();
            }
        });
    }

    private static convertValue(value: any, targetType?: 'string' | 'number' | 'boolean' | 'date', format?: string): any {
        if (value === null || value === undefined) {
            return value;
        }

        switch (targetType) {
            case 'string':
                return String(value);
            case 'number':
                const num = Number(value);
                return isNaN(num) ? value : num; // Return original if conversion fails
            case 'boolean':
                return String(value).toLowerCase() === 'true' || String(value) === '1';
            case 'date':
                const date = new Date(value);
                return isNaN(date.getTime()) ? value : (format ? this.formatDate(date, format) : date.toISOString());
            default:
                return value;
        }
    }

    private static formatDate(date: Date, format: string): string {
        // Basic date formatting. For complex formats, a library like 'date-fns' or 'moment' would be used.
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');

        return format
            .replace(/YYYY/g, year.toString())
            .replace(/MM/g, month)
            .replace(/DD/g, day)
            .replace(/HH/g, hours)
            .replace(/mm/g, minutes)
            .replace(/ss/g, seconds);
    }

    // Placeholder for aggregation logic. This would typically be a separate process
    // that consumes the transformed stream and produces aggregated results.
    // For example, a separate function that takes a stream and an aggregation config.
    static aggregateStream(stream: NodeJS.ReadableStream, aggregationConfig: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const results: { [key: string]: any } = {};
            stream.on('data', (chunk) => {
                // Simplified aggregation: just sum a field for demonstration
                const groupBy = aggregationConfig.groupByField ? chunk[aggregationConfig.groupByField] : 'total';
                if (!results[groupBy]) {
                    results[groupBy] = { count: 0, sum: 0 };
                }
                if (aggregationConfig.operation === 'count') {
                    results[groupBy].count++;
                } else if (aggregationConfig.operation === 'sum' && typeof chunk[aggregationConfig.field] === 'number') {
                    results[groupBy].sum += chunk[aggregationConfig.field];
                }
                // Add logic for avg, min, max
            });
            stream.on('end', () => resolve(results));
            stream.on('error', reject);
        });
    }
}

export default DataTransformer;