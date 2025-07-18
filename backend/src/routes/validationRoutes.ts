import { Router, Request, Response } from 'express';
import { ValidationEngine, ValidationRule, ValidationResult } from '../services/ValidationEngine';
import { QualityScorer, QualityScore, FieldImportance } from '../services/QualityScorer';
import { IntegrityChecker, IntegrityRule, IntegrityCheckResult } from '../services/IntegrityChecker';
import ScrapedDataModel from '../../models/ScrapedData'; // Import the Sequelize model
import ProjectModel from '../../models/Project'; // Import the Project model
import ScraperModel from '../../models/Scraper'; // Import the Scraper model
import { ScrapedDataAttributes } from '../types/scrapedData'; // New import
import { ScraperAttributes } from '../types/scraper'; // New import

const router = Router();

// In a real application, these would be stored in a database and associated with projects/scrapers
const validationRulesStore: { [projectId: string]: ValidationRule[] } = {};
const integrityRulesStore: { [projectId: string]: IntegrityRule[] } = {};
const fieldImportanceStore: { [projectId: string]: FieldImportance } = {};

/**
 * POST /api/validation/rules
 * Create or update validation rules for a project.
 * Body: { projectId: string, rules: ValidationRule[], integrityRules?: IntegrityRule[], fieldImportance?: FieldImportance }
 */
router.post('/validation/rules', async (req: Request, res: Response) => {
  const { projectId, rules, integrityRules, fieldImportance } = req.body;

  if (!projectId || !rules) {
    return res.status(400).json({ message: 'Project ID and validation rules are required.' });
  }

  validationRulesStore[projectId] = rules;
  if (integrityRules) {
    integrityRulesStore[projectId] = integrityRules;
  }
  if (fieldImportance) {
    fieldImportanceStore[projectId] = fieldImportance;
  }

  res.status(200).json({ message: 'Validation rules updated successfully.' });
});

/**
 * POST /api/data/:id/validate
 * Trigger validation for a specific scraped data entry or a set of entries.
 * :id can be a single scrapedData ID or 'batch' for multiple.
 */
router.post('/data/:id/validate', async (req: Request, res: Response) => {
  const { id } = req.params;
  let dataToValidate: ScrapedDataAttributes[] = [];

  try {
    if (id === 'batch') {
      // Expect an array of scraped data objects in the body for batch validation
      dataToValidate = req.body.data as ScrapedDataAttributes[];
      if (!Array.isArray(dataToValidate) || dataToValidate.length === 0) {
        return res.status(400).json({ message: 'For batch validation, "data" array is required in the body.' });
      }
    } else {
      // Fetch single scraped data entry by ID
      const scrapedDataItem = await ScrapedDataModel.findByPk(id);
      if (!scrapedDataItem) {
        return res.status(404).json({ message: 'Scraped data not found.' });
      }
      dataToValidate = [scrapedDataItem.toJSON() as ScrapedDataAttributes];
    }

    // Determine projectId from the first data item (assuming all belong to same project/scraper)
    // In a real scenario, this might need to be more robust, e.g., passing projectId explicitly.
    const scraperInstance = dataToValidate[0]?.scraper_id ?
                            await ScraperModel.findByPk(dataToValidate[0].scraper_id) :
                            null;
    const projectId = scraperInstance ? (scraperInstance.toJSON() as ScraperAttributes).project_id : undefined;

    if (!projectId) {
      return res.status(400).json({ message: 'Could not determine project ID for validation.' });
    }

    const validationEngine = new ValidationEngine(validationRulesStore[projectId] || []);
    const integrityChecker = new IntegrityChecker(integrityRulesStore[projectId] || []);

    const validationResults: ValidationResult[] = [];
    const integrityResults: IntegrityCheckResult[] = [];

    for (const dataItem of dataToValidate) {
      validationResults.push(await validationEngine.validate(dataItem));
      integrityResults.push(await integrityChecker.checkIntegrity([dataItem]));
    }

    // Aggregate results for quality scoring
    const qualityScorer = new QualityScorer(fieldImportanceStore[projectId]);
    const overallQualityScore = await qualityScorer.calculateQualityScore(
      dataToValidate, // Pass data directly, as it's already ScrapedDataAttributes[]
      validationResults
    );

    res.status(200).json({
      message: 'Validation and quality assessment complete.',
      validationResults,
      integrityResults,
      overallQualityScore,
    });

  } catch (error: unknown) {
    console.error('Error during data validation:', error);
    res.status(500).json({ message: 'Internal server error during validation.', error: (error as Error).message });
  }
});

/**
 * GET /api/validation/reports/:project_id
 * Get detailed validation reports for a project.
 */
router.get('/validation/reports/:project_id', async (req: Request, res: Response) => {
  const { project_id } = req.params;

  // In a real application, this would fetch historical validation results from a database
  // For now, we'll return a placeholder or aggregated results if available in memory.
  const mockReport = {
    projectId: project_id,
    lastRun: new Date().toISOString(),
    totalRecordsValidated: 1000,
    totalErrors: 50,
    errorBreakdown: {
      requiredFieldMissing: 20,
      invalidFormat: 15,
      crossFieldMismatch: 10,
      customRuleViolation: 5,
    },
    qualityScore: 95,
    recommendations: ['Review invalid format errors.', 'Implement stricter cross-field checks.'],
  };

  res.status(200).json(mockReport);
});

/**
 * GET /api/quality/score/:scraper_id
 * Get quality score for a specific scraper.
 */
router.get('/quality/score/:scraper_id', async (req: Request, res: Response) => {
  const { scraper_id } = req.params;

  try {
    const scraper = await ScraperModel.findByPk(scraper_id);
    if (!scraper) {
      return res.status(404).json({ message: 'Scraper not found.' });
    }

    // In a real application, this would fetch aggregated quality scores for the scraper
    // from a database. For now, we'll return a placeholder.
    const mockQualityScore = {
      scraperId: scraper_id,
      lastCalculated: new Date().toISOString(),
      totalScore: 92.5,
      completenessScore: 95,
      accuracyScore: 90,
      consistencyScore: 93,
      fieldScores: {
        title: 98,
        price: 85,
        description: 90,
      },
      recommendations: ['Monitor price field accuracy.', 'Ensure consistent description length.'],
    };

    res.status(200).json(mockQualityScore);

  } catch (error: unknown) {
    console.error('Error fetching quality score:', error);
    res.status(500).json({ message: 'Internal server error fetching quality score.', error: (error as Error).message });
  }
});

export default router;