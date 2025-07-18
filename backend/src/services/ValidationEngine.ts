import { ScrapedDataAttributes } from '../types/scrapedData';

export interface ValidationRule {
  field: string;
  type: 'required' | 'dataType' | 'range' | 'pattern' | 'custom';
  value?: any;
  pattern?: string;
  customFunction?: string; // String representation of a function for dynamic execution
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: { field: string; message: string; }[];
}

export class ValidationEngine {
  private rules: ValidationRule[] = [];

  constructor(rules?: ValidationRule[]) {
    if (rules) {
      this.rules = rules;
    }
  }

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  addRules(rules: ValidationRule[]): void {
    this.rules.push(...rules);
  }

  async validate(data: ScrapedData | ScrapedData[]): Promise<ValidationResult> {
    const results: ValidationResult = { isValid: true, errors: [] };
    const dataArray = Array.isArray(data) ? data : [data];

    for (const item of dataArray) {
      for (const rule of this.rules) {
        const fieldValue = item.data[rule.field];
        let fieldIsValid = true;
        let errorMessage = `Validation failed for field '${rule.field}'`;

        switch (rule.type) {
          case 'required':
            if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
              fieldIsValid = false;
              errorMessage = rule.message || `${rule.field} is required.`;
            }
            break;
          case 'dataType':
            // Basic type checking
            if (rule.value === 'string' && typeof fieldValue !== 'string') {
              fieldIsValid = false;
              errorMessage = rule.message || `${rule.field} must be a string.`;
            } else if (rule.value === 'number' && typeof fieldValue !== 'number') {
              fieldIsValid = false;
              errorMessage = rule.message || `${rule.field} must be a number.`;
            }
            // Add more data types as needed (e.g., boolean, array, object)
            break;
          case 'range':
            if (typeof fieldValue === 'number' && (fieldValue < rule.value.min || fieldValue > rule.value.max)) {
              fieldIsValid = false;
              errorMessage = rule.message || `${rule.field} must be between ${rule.value.min} and ${rule.value.max}.`;
            }
            break;
          case 'pattern':
            if (typeof fieldValue === 'string' && rule.pattern && !new RegExp(rule.pattern).test(fieldValue)) {
              fieldIsValid = false;
              errorMessage = rule.message || `${rule.field} does not match the required pattern.`;
            }
            break;
          case 'custom':
            if (rule.customFunction) {
              try {
                // This is a simplified and potentially unsafe way to execute custom functions.
                // In a real application, consider a safer sandboxed environment (e.g., vm module in Node.js).
                const customFunc = new Function('value', 'dataItem', rule.customFunction);
                if (!customFunc(fieldValue, item.data)) {
                  fieldIsValid = false;
                  errorMessage = rule.message || `Custom validation failed for ${rule.field}.`;
                }
              } catch (error) {
                console.error(`Error executing custom validation function for ${rule.field}:`, error);
                fieldIsValid = false;
                errorMessage = rule.message || `Error in custom validation for ${rule.field}.`;
              }
            }
            break;
        }

        if (!fieldIsValid) {
          results.isValid = false;
          results.errors.push({ field: rule.field, message: errorMessage });
        }
      }
    }
    return results;
  }

  // Method for batch validation
  async batchValidate(datasets: ScrapedData[][]): Promise<ValidationResult[]> {
    const batchResults: ValidationResult[] = [];
    for (const dataset of datasets) {
      batchResults.push(await this.validate(dataset));
    }
    return batchResults;
  }
}