import { ScrapedDataAttributes } from '../types/scrapedData';
import { ValidationResult } from './ValidationEngine';

export interface FieldImportance {
  [fieldName: string]: number; // Weight for each field, e.g., { 'title': 0.4, 'price': 0.6 }
}

export interface QualityScore {
  totalScore: number; // Overall quality score (e.g., 0-100)
  completenessScore: number;
  accuracyScore: number;
  consistencyScore: number;
  fieldScores: { [fieldName: string]: number }; // Scores per field
  recommendations: string[];
}

export class QualityScorer {
  private fieldImportance: FieldImportance = {};

  constructor(fieldImportance?: FieldImportance) {
    if (fieldImportance) {
      this.fieldImportance = fieldImportance;
    }
  }

  setFieldImportance(importance: FieldImportance): void {
    this.fieldImportance = importance;
  }

  async calculateQualityScore(
    data: ScrapedDataAttributes[],
    validationResults: ValidationResult[]
  ): Promise<QualityScore> {
    if (data.length === 0) {
      return {
        totalScore: 0,
        completenessScore: 0,
        accuracyScore: 0,
        consistencyScore: 0,
        fieldScores: {},
        recommendations: ['No data provided for quality scoring.'],
      };
    }

    const totalFields = data.length * Object.keys(data[0].data).length; // Assuming all data items have same fields
    let populatedFields = 0;
    const fieldCompletion: { [key: string]: number } = {};

    // Calculate completeness
    data.forEach(item => {
      for (const field in item.data) {
        if (item.data[field] !== undefined && item.data[field] !== null && item.data[field] !== '') {
          populatedFields++;
          fieldCompletion[field] = (fieldCompletion[field] || 0) + 1;
        }
      }
    });

    const completenessScore = (populatedFields / totalFields) * 100;

    // Calculate accuracy based on validation results
    let totalErrors = 0;
    validationResults.forEach(result => {
      totalErrors += result.errors.length;
    });

    const accuracyScore = ((totalFields - totalErrors) / totalFields) * 100;

    // Placeholder for consistency score - requires more complex logic (e.g., duplicate detection, outlier analysis)
    const consistencyScore = 100; // To be implemented

    // Calculate weighted field scores
    const fieldScores: { [fieldName: string]: number } = {};
    for (const field in fieldCompletion) {
        const completionRatio = fieldCompletion[field] / data.length;
        const importance = this.fieldImportance[field] || 1; // Default importance to 1 if not specified
        fieldScores[field] = completionRatio * 100 * importance;
    }

    // Aggregate total score
    const totalScore = (completenessScore * 0.4) + (accuracyScore * 0.4) + (consistencyScore * 0.2); // Example weighting

    const recommendations: string[] = [];
    if (completenessScore < 90) {
      recommendations.push('Improve data completeness by ensuring all required fields are present.');
    }
    if (accuracyScore < 90) {
      recommendations.push('Address validation errors to improve data accuracy.');
    }
    // Add more recommendations based on consistency, specific field scores, etc.

    return {
      totalScore,
      completenessScore,
      accuracyScore,
      consistencyScore,
      fieldScores,
      recommendations,
    };
  }

  // Placeholder for historical quality trend analysis
  async getHistoricalQualityTrends(): Promise<any> {
    // This would involve querying a database for historical quality scores
    // and performing trend analysis.
    return { message: 'Historical quality trend analysis not yet implemented.' };
  }
}