import { ScrapedDataAttributes } from '../types/scrapedData';

export interface IntegrityRule {
  type: 'crossField' | 'referenceData' | 'format' | 'businessRule';
  fields?: string[]; // Fields involved in the rule
  referenceDataset?: any[]; // For referenceData checks
  pattern?: string; // For format checks
  businessLogic?: string; // String representation of a function for dynamic execution
  message?: string;
}

export interface IntegrityCheckResult {
  isIntegrityValid: boolean;
  integrityErrors: { ruleType: string; message: string; }[];
}

export class IntegrityChecker {
  private rules: IntegrityRule[] = [];

  constructor(rules?: IntegrityRule[]) {
    if (rules) {
      this.rules = rules;
    }
  }

  addRule(rule: IntegrityRule): void {
    this.rules.push(rule);
  }

  addRules(rules: IntegrityRule[]): void {
    this.rules.push(...rules);
  }

  async checkIntegrity(data: ScrapedDataAttributes[]): Promise<IntegrityCheckResult> {
    const results: IntegrityCheckResult = { isIntegrityValid: true, integrityErrors: [] };

    for (const item of data) {
      for (const rule of this.rules) {
        let ruleIsValid = true;
        let errorMessage = `Integrity check failed for rule type '${rule.type}'`;

        switch (rule.type) {
          case 'crossField':
            if (rule.fields && rule.fields.length >= 2) {
              // Example: Ensure field1 is greater than field2
              const field1Value = item.data[rule.fields[0]];
              const field2Value = item.data[rule.fields[1]];
              if (typeof field1Value === 'number' && typeof field2Value === 'number' && field1Value <= field2Value) {
                ruleIsValid = false;
                errorMessage = rule.message || `${rule.fields[0]} must be greater than ${rule.fields[1]}.`;
              }
              // More complex cross-field logic can be added here
            }
            break;
          case 'referenceData':
            if (rule.fields && rule.fields.length > 0 && rule.referenceDataset) {
              const fieldValue = item.data[rule.fields[0]];
              if (!rule.referenceDataset.includes(fieldValue)) {
                ruleIsValid = false;
                errorMessage = rule.message || `${rule.fields[0]} value '${fieldValue}' is not in reference data.`;
              }
            }
            break;
          case 'format':
            if (rule.fields && rule.fields.length > 0 && rule.pattern) {
              const fieldValue = item.data[rule.fields[0]];
              if (typeof fieldValue === 'string' && !new RegExp(rule.pattern).test(fieldValue)) {
                ruleIsValid = false;
                errorMessage = rule.message || `${rule.fields[0]} does not match the required format.`;
              }
            }
            break;
          case 'businessRule':
            if (rule.businessLogic) {
              try {
                const businessFunc = new Function('dataItem', rule.businessLogic);
                if (!businessFunc(item.data)) {
                  ruleIsValid = false;
                  errorMessage = rule.message || `Business rule validation failed.`;
                }
              } catch (error) {
                console.error(`Error executing business rule logic:`, error);
                ruleIsValid = false;
                errorMessage = rule.message || `Error in business rule validation.`;
              }
            }
            break;
        }

        if (!ruleIsValid) {
          results.isIntegrityValid = false;
          results.integrityErrors.push({ ruleType: rule.type, message: errorMessage });
        }
      }
    }
    return results;
  }
}