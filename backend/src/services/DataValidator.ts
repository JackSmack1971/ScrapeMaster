// DataValidator.ts
// This service handles schema validation, data type verification and conversion,
// required field completeness checking, and quality scoring.

class DataValidator {
    constructor() {
        // Initialize with predefined schemas or a mechanism to load them
    }

    /**
     * Validates a data object against a predefined schema.
     * @param data - The data object to validate.
     * @param schema - The schema to validate against (e.g., JSON schema).
     * @returns A promise that resolves to a validation result object.
     */
    async validate(data: any, schema: any): Promise<ValidationResult> {
        console.log('Validating data:', data, 'against schema:', schema);
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            qualityScore: 100, // Default to 100, will be adjusted
            validatedData: { ...data } // Start with a copy of the data
        };

        // 1. Schema validation
        // (Placeholder for actual schema validation logic, e.g., using 'ajv' library)
        if (!this.performSchemaValidation(data, schema, result.errors)) {
            result.isValid = false;
        }

        // 2. Data type verification and conversion
        this.verifyAndConvertTypes(data, schema, result.errors, result.validatedData);

        // 3. Required field completeness checking
        this.checkRequiredFields(data, schema, result.errors);

        // 4. Quality scoring
        result.qualityScore = this.calculateQualityScore(data, schema, result.errors);

        return result;
    }

    private performSchemaValidation(data: any, schema: any, errors: ValidationError[]): boolean {
        // In a real implementation, use a library like 'ajv' here.
        // For demonstration, a basic check:
        let isValid = true;
        for (const key in schema.properties) {
            if (schema.properties[key].required && !(key in data)) {
                errors.push({ field: key, message: `${key} is required.` });
                isValid = false;
            }
        }
        return isValid;
    }

    private verifyAndConvertTypes(data: any, schema: any, errors: ValidationError[], validatedData: any): void {
        for (const key in schema.properties) {
            if (key in data) {
                const expectedType = schema.properties[key].type;
                const actualType = typeof data[key];

                if (expectedType === 'number' && actualType === 'string') {
                    const numValue = parseFloat(data[key]);
                    if (isNaN(numValue)) {
                        errors.push({ field: key, message: `${key} should be a number, but received "${data[key]}".` });
                    } else {
                        validatedData[key] = numValue;
                    }
                } else if (expectedType === 'string' && actualType === 'number') {
                    validatedData[key] = String(data[key]);
                } else if (expectedType === 'boolean' && actualType === 'string') {
                    if (data[key].toLowerCase() === 'true') {
                        validatedData[key] = true;
                    } else if (data[key].toLowerCase() === 'false') {
                        validatedData[key] = false;
                    } else {
                        errors.push({ field: key, message: `${key} should be a boolean, but received "${data[key]}".` });
                    }
                }
                // Add more type conversions as needed
            }
        }
    }

    private checkRequiredFields(data: any, schema: any, errors: ValidationError[]): void {
        if (schema.required) {
            schema.required.forEach((field: string) => {
                if (!(field in data) || data[field] === null || data[field] === undefined || data[field] === '') {
                    errors.push({ field: field, message: `${field} is a required field and is missing or empty.` });
                }
            });
        }
    }

    private calculateQualityScore(data: any, schema: any, errors: ValidationError[]): number {
        let score = 100;
        const totalFields = Object.keys(schema.properties).length;
        if (totalFields === 0) return 100;

        const missingRequiredFields = errors.filter(err => err.message.includes('required')).length;
        const typeErrors = errors.filter(err => err.message.includes('should be a')).length;

        // Deduct points for missing required fields
        score -= (missingRequiredFields / (schema.required ? schema.required.length : 1)) * 50; // Significant deduction

        // Deduct points for type errors
        score -= (typeErrors / totalFields) * 30; // Moderate deduction

        // Further deductions for other types of errors or inconsistencies
        // (e.g., format errors, out-of-range values)

        return Math.max(0, Math.round(score)); // Ensure score is not negative
    }
}

interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    qualityScore: number;
    validatedData: any;
}

interface ValidationError {
    field: string;
    message: string;
}

export default DataValidator;