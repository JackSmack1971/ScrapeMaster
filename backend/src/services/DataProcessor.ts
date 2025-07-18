import { Transform } from 'stream';

interface DataCleaningOptions {
    trimStrings?: boolean;
    normalizeWhitespace?: boolean;
    deduplicate?: boolean;
    deduplicateFields?: string[];
}

interface MissingValueHandlingOptions {
    strategy: 'remove_row' | 'fill_value' | 'fill_mean' | 'fill_median' | 'fill_mode';
    fillValue?: any;
    fields?: string[]; // Specific fields to apply strategy to
}

interface DataValidationRule {
    field: string;
    rule: string; // e.g., 'isEmail', 'isNumeric', 'minLength:5', 'custom:myCustomFunc'
    message: string;
}

interface ValidationResult {
    isValid: boolean;
    errors: { field: string; message: string; value: any }[];
    validatedData: any;
}

class DataProcessor {

    /**
     * Applies data cleaning operations to a dataset.
     * @param data - Array of data objects.
     * @param options - Data cleaning options.
     * @returns Cleaned data.
     */
    cleanData(data: any[], options?: DataCleaningOptions): any[] {
        let cleanedData = [...data];

        if (options?.trimStrings || options?.normalizeWhitespace) {
            cleanedData = cleanedData.map(record => {
                const newRecord: { [key: string]: any } = {};
                for (const key in record) {
                    if (typeof record[key] === 'string') {
                        let value = record[key];
                        if (options.trimStrings) {
                            value = value.trim();
                        }
                        if (options.normalizeWhitespace) {
                            value = value.replace(/\s+/g, ' ').trim();
                        }
                        newRecord[key] = value;
                    } else {
                        newRecord[key] = record[key];
                    }
                }
                return newRecord;
            });
        }

        if (options?.deduplicate) {
            const seen = new Set();
            cleanedData = cleanedData.filter(record => {
                const identifier = options.deduplicateFields ?
                    options.deduplicateFields.map(field => record[field]).join('|') :
                    JSON.stringify(record);
                if (seen.has(identifier)) {
                    return false;
                }
                seen.add(identifier);
                return true;
            });
        }

        return cleanedData;
    }

    /**
     * Handles missing values in a dataset.
     * @param data - Array of data objects.
     * @param options - Missing value handling options.
     * @returns Data with missing values handled.
     */
    handleMissingValues(data: any[], options: MissingValueHandlingOptions): any[] {
        let processedData = [...data];

        if (options.strategy === 'remove_row') {
            processedData = processedData.filter(record => {
                if (options.fields) {
                    return options.fields.every(field => record[field] !== undefined && record[field] !== null && record[field] !== '');
                }
                // If no specific fields, remove row if any field is missing
                return Object.values(record).every(value => value !== undefined && value !== null && value !== '');
            });
        } else if (options.strategy === 'fill_value' && options.fillValue !== undefined) {
            processedData = processedData.map(record => {
                const newRecord = { ...record };
                const fieldsToProcess = options.fields || Object.keys(record);
                fieldsToProcess.forEach(field => {
                    if (newRecord[field] === undefined || newRecord[field] === null || newRecord[field] === '') {
                        newRecord[field] = options.fillValue;
                    }
                });
                return newRecord;
            });
        } else if (['fill_mean', 'fill_median', 'fill_mode'].includes(options.strategy)) {
            // This would require a first pass to calculate statistics
            const numericFields = options.fields || Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
            const statistics: { [key: string]: { mean?: number; median?: number; mode?: any } } = {};

            numericFields.forEach(field => {
                const values = data.map(record => record[field]).filter(value => typeof value === 'number');
                if (values.length > 0) {
                    if (options.strategy === 'fill_mean') {
                        statistics[field] = { mean: values.reduce((sum, val) => sum + val, 0) / values.length };
                    } else if (options.strategy === 'fill_median') {
                        values.sort((a, b) => a - b);
                        const mid = Math.floor(values.length / 2);
                        statistics[field] = { median: values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid] };
                    } else if (options.strategy === 'fill_mode') {
                        const modeMap: { [key: string]: number } = {};
                        let maxCount = 0;
                        let modeValue: any;
                        values.forEach(val => {
                            modeMap[val] = (modeMap[val] || 0) + 1;
                            if (modeMap[val] > maxCount) {
                                maxCount = modeMap[val];
                                modeValue = val;
                            }
                        });
                        statistics[field] = { mode: modeValue };
                    }
                }
            });

            processedData = processedData.map(record => {
                const newRecord = { ...record };
                numericFields.forEach(field => {
                    if (newRecord[field] === undefined || newRecord[field] === null || newRecord[field] === '') {
                        if (options.strategy === 'fill_mean' && statistics[field]?.mean !== undefined) {
                            newRecord[field] = statistics[field].mean;
                        } else if (options.strategy === 'fill_median' && statistics[field]?.median !== undefined) {
                            newRecord[field] = statistics[field].median;
                        } else if (options.strategy === 'fill_mode' && statistics[field]?.mode !== undefined) {
                            newRecord[field] = statistics[field].mode;
                        }
                    }
                });
                return newRecord;
            });
        }
        return processedData;
    }

    /**
     * Validates data against a set of custom rules.
     * @param data - Array of data objects.
     * @param rules - Array of validation rules.
     * @returns Validation result including validity status, errors, and validated data.
     */
    validateData(data: any[], rules: DataValidationRule[]): ValidationResult {
        const errors: { field: string; message: string; value: any }[] = [];
        const validatedData = data.map(record => {
            const newRecord = { ...record };
            rules.forEach(rule => {
                const value = newRecord[rule.field];
                let isValid = true;
                let errorMessage = '';

                if (rule.rule.startsWith('minLength:')) {
                    const minLength = parseInt(rule.rule.split(':')[1]);
                    if (typeof value === 'string' && value.length < minLength) {
                        isValid = false;
                        errorMessage = rule.message || `Field ${rule.field} must have a minimum length of ${minLength}.`;
                    }
                } else if (rule.rule === 'isEmail') {
                    // Basic email regex
                    if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        isValid = false;
                        errorMessage = rule.message || `Field ${rule.field} must be a valid email address.`;
                    }
                } else if (rule.rule === 'isNumeric') {
                    if (typeof value !== 'number' && isNaN(Number(value))) {
                        isValid = false;
                        errorMessage = rule.message || `Field ${rule.field} must be numeric.`;
                    }
                }
                // Add more built-in rules as needed

                if (!isValid) {
                    errors.push({ field: rule.field, message: errorMessage, value });
                }
            });
            return newRecord;
        });

        return {
            isValid: errors.length === 0,
            errors,
            validatedData,
        };
    }

    /**
     * Generates a basic statistical summary for numeric fields.
     * @param data - Array of data objects.
     * @returns Statistical summary.
     */
    getStatisticalSummary(data: any[]): { [key: string]: { count: number; sum: number; mean: number; min: number; max: number; median: number; mode: any } } {
        const summary: { [key: string]: { count: number; sum: number; mean: number; min: number; max: number; median: number; mode: any } } = {};

        if (data.length === 0) return summary;

        const numericFields = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');

        numericFields.forEach(field => {
            const values = data.map(record => record[field]).filter(value => typeof value === 'number');
            if (values.length > 0) {
                const sum = values.reduce((acc, val) => acc + val, 0);
                const mean = sum / values.length;
                const min = Math.min(...values);
                const max = Math.max(...values);

                values.sort((a, b) => a - b);
                const mid = Math.floor(values.length / 2);
                const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

                const modeMap: { [key: string]: number } = {};
                let maxCount = 0;
                let modeValue: any;
                values.forEach(val => {
                    modeMap[val] = (modeMap[val] || 0) + 1;
                    if (modeMap[val] > maxCount) {
                        maxCount = modeMap[val];
                        modeValue = val;
                    }
                });

                summary[field] = {
                    count: values.length,
                    sum,
                    mean,
                    min,
                    max,
                    median,
                    mode: modeValue,
                };
            }
        });
        return summary;
    }

    /**
     * Generates a data quality assessment report.
     * @param data - Array of data objects.
     * @returns Data quality report.
     */
    getDataQualityReport(data: any[]): { totalRecords: number; fields: { [key: string]: { missingCount: number; emptyStringCount: number; uniqueCount: number; dataType: string; } } } {
        const report: { totalRecords: number; fields: { [key: string]: { missingCount: number; emptyStringCount: number; uniqueCount: number; dataType: string; } } } = {
            totalRecords: data.length,
            fields: {},
        };

        if (data.length === 0) return report;

        const allFields = Array.from(new Set(data.flatMap(record => Object.keys(record))));

        allFields.forEach(field => {
            let missingCount = 0;
            let emptyStringCount = 0;
            const uniqueValues = new Set();
            let dataType: string = 'unknown';

            data.forEach(record => {
                const value = record[field];
                if (value === undefined || value === null) {
                    missingCount++;
                } else {
                    if (typeof value === 'string' && value.trim() === '') {
                        emptyStringCount++;
                    }
                    uniqueValues.add(value);
                    if (dataType === 'unknown') {
                        dataType = typeof value;
                    }
                }
            });

            report.fields[field] = {
                missingCount,
                emptyStringCount,
                uniqueCount: uniqueValues.size,
                dataType,
            };
        });

        return report;
    }

    /**
     * Generates a duplicate detection report.
     * @param data - Array of data objects.
     * @param fields - Optional. Fields to consider for duplicate detection. If not provided, uses all fields.
     * @returns Duplicate detection report.
     */
    getDuplicateDetectionReport(data: any[], fields?: string[]): { totalRecords: number; duplicateRecords: any[]; duplicateGroups: { [key: string]: any[] } } {
        const report: { totalRecords: number; duplicateRecords: any[]; duplicateGroups: { [key: string]: any[] } } = {
            totalRecords: data.length,
            duplicateRecords: [],
            duplicateGroups: {},
        };

        if (data.length === 0) return report;

        const seenHashes: { [key: string]: any[] } = {};

        data.forEach(record => {
            const keysToHash = fields || Object.keys(record);
            const hash = JSON.stringify(keysToHash.map(key => record[key])); // Simple hash based on selected fields
            
            if (seenHashes[hash]) {
                seenHashes[hash].push(record);
            } else {
                seenHashes[hash] = [record];
            }
        });

        for (const hash in seenHashes) {
            if (seenHashes[hash].length > 1) {
                report.duplicateGroups[hash] = seenHashes[hash];
                report.duplicateRecords.push(...seenHashes[hash]);
            }
        }

        return report;
    }
}

export default DataProcessor;