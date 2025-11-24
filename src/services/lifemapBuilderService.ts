/**
 * Lifemap Builder Service
 * Orchestrates the entire lifemap initialization flow:
 * 1. Analyze documents
 * 2. Extract people
 * 3. Deduplicate
 * 4. Create person nodes
 * 5. Place documents
 * 6. Upload to Drive
 */

import { documentAnalysisService, DocumentAnalysis } from './documentAnalysisService';
import { documentPlacementService, PlacementDecision } from './documentPlacementService';
import { personExtractionService, ExtractedPerson } from './personExtractionService';
import { personDeduplicationService } from './personDeduplicationService';
import { personNodeCreationService, PersonCreationResult } from './personNodeCreationService';
import { DocumentGraphModel } from '../data/standalone-model-implementation';
import { StandaloneEntity } from '../data/standalone-model';

export interface BuildProgress {
  phase:
    | 'analyzing'
    | 'extracting-people'
    | 'creating-tree'
    | 'placing-documents'
    | 'uploading'
    | 'complete'
    | 'error';
  filesProcessed: number;
  totalFiles: number;
  peopleFound: ExtractedPerson[];
  nodesCreated: number;
  currentOperation?: string;
  error?: string;
}

export interface BuildResult {
  success: boolean;
  peopleCreated: number;
  documentsPlaced: number;
  categoriesCreated: number;
  errors: string[];
  people: PersonCreationResult[];
}

export interface DocumentWithAnalysis {
  file: File;
  analysis: DocumentAnalysis;
  placement?: PlacementDecision;
  entity?: StandaloneEntity;
  error?: string;
}

export class LifemapBuilderService {
  private static instance: LifemapBuilderService | null = null;

  private constructor() {}

  static getInstance(): LifemapBuilderService {
    if (!LifemapBuilderService.instance) {
      LifemapBuilderService.instance = new LifemapBuilderService();
    }
    return LifemapBuilderService.instance;
  }

  /**
   * Build lifemap from documents
   * This is the main entry point for the onboarding flow
   */
  async buildFromDocuments(
    familyName: string,
    files: File[],
    model: DocumentGraphModel,
    userEmail: string,
    progressCallback: (progress: BuildProgress) => void
  ): Promise<BuildResult> {
    const errors: string[] = [];
    let peopleCreated = 0;
    let documentsPlaced = 0;
    let categoriesCreated = 0;
    let createdPeople: PersonCreationResult[] = [];

    try {
      // Phase 1: Analyze all documents
      progressCallback({
        phase: 'analyzing',
        filesProcessed: 0,
        totalFiles: files.length,
        peopleFound: [],
        nodesCreated: 0,
        currentOperation: 'Starting document analysis...',
      });

      const documentsWithAnalysis = await this.analyzeDocuments(
        files,
        (processed, fileName) => {
          progressCallback({
            phase: 'analyzing',
            filesProcessed: processed,
            totalFiles: files.length,
            peopleFound: [],
            nodesCreated: 0,
            currentOperation: `Analyzing ${fileName}...`,
          });
        }
      );

      const successfulAnalyses = documentsWithAnalysis.filter((d) => !d.error);
      const failedAnalyses = documentsWithAnalysis.filter((d) => d.error);

      if (failedAnalyses.length > 0) {
        errors.push(
          ...failedAnalyses.map((d) => `Failed to analyze ${d.file.name}: ${d.error}`)
        );
      }

      // Phase 2: Extract people from analyses
      progressCallback({
        phase: 'extracting-people',
        filesProcessed: files.length,
        totalFiles: files.length,
        peopleFound: [],
        nodesCreated: 0,
        currentOperation: 'Extracting people from documents...',
      });

      const allExtractedPeople = await this.extractPeople(
        successfulAnalyses,
        familyName
      );

      // Deduplicate people
      const uniquePeople = personDeduplicationService.deduplicate(allExtractedPeople);

      console.log(`Found ${uniquePeople.length} unique people:`, uniquePeople.map((p) => p.fullName));

      progressCallback({
        phase: 'extracting-people',
        filesProcessed: files.length,
        totalFiles: files.length,
        peopleFound: uniquePeople,
        nodesCreated: 0,
        currentOperation: `Found ${uniquePeople.length} people`,
      });

      // Phase 3: Create person nodes and categories
      if (uniquePeople.length > 0) {
        progressCallback({
          phase: 'creating-tree',
          filesProcessed: files.length,
          totalFiles: files.length,
          peopleFound: uniquePeople,
          nodesCreated: 0,
          currentOperation: 'Creating person nodes...',
        });

        createdPeople = await personNodeCreationService.createPersonNodes(
          uniquePeople,
          model,
          userEmail
        );

        peopleCreated = createdPeople.filter((p) => p.isNew).length;
        categoriesCreated = createdPeople.reduce((sum, p) => sum + p.categories.length, 0);

        progressCallback({
          phase: 'creating-tree',
          filesProcessed: files.length,
          totalFiles: files.length,
          peopleFound: uniquePeople,
          nodesCreated: peopleCreated + categoriesCreated,
          currentOperation: `Created ${peopleCreated} people and ${categoriesCreated} categories`,
        });
      } else {
        console.warn('No people found in documents');
        errors.push('No people matching family name found in documents');
      }

      // Phase 4: Place documents in tree
      progressCallback({
        phase: 'placing-documents',
        filesProcessed: 0,
        totalFiles: files.length,
        peopleFound: uniquePeople,
        nodesCreated: peopleCreated + categoriesCreated,
        currentOperation: 'Determining document placements...',
      });

      const placedDocuments = await this.placeDocuments(
        documentsWithAnalysis,
        model,
        userEmail,
        (processed, fileName) => {
          progressCallback({
            phase: 'placing-documents',
            filesProcessed: processed,
            totalFiles: files.length,
            peopleFound: uniquePeople,
            nodesCreated: peopleCreated + categoriesCreated + processed,
            currentOperation: `Placing ${fileName}...`,
          });
        }
      );

      documentsPlaced = placedDocuments.filter((d) => d.entity && !d.error).length;

      const placementErrors = placedDocuments.filter((d) => d.error);
      if (placementErrors.length > 0) {
        errors.push(
          ...placementErrors.map((d) => `Failed to place ${d.file.name}: ${d.error}`)
        );
      }

      // Phase 5: Complete
      progressCallback({
        phase: 'complete',
        filesProcessed: files.length,
        totalFiles: files.length,
        peopleFound: uniquePeople,
        nodesCreated: peopleCreated + categoriesCreated + documentsPlaced,
        currentOperation: 'Lifemap created successfully!',
      });

      return {
        success: errors.length === 0,
        peopleCreated,
        documentsPlaced,
        categoriesCreated,
        errors,
        people: createdPeople,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Lifemap builder error:', error);

      progressCallback({
        phase: 'error',
        filesProcessed: 0,
        totalFiles: files.length,
        peopleFound: [],
        nodesCreated: 0,
        error: errorMessage,
      });

      return {
        success: false,
        peopleCreated,
        documentsPlaced,
        categoriesCreated,
        errors: [errorMessage, ...errors],
        people: createdPeople,
      };
    }
  }

  /**
   * Analyze all documents
   */
  private async analyzeDocuments(
    files: File[],
    progressCallback: (processed: number, fileName: string) => void
  ): Promise<DocumentWithAnalysis[]> {
    const results: DocumentWithAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressCallback(i + 1, file.name);

      try {
        const analysis = await documentAnalysisService.analyzeDocument(file);

        if ('error' in analysis) {
          results.push({
            file,
            analysis: {} as DocumentAnalysis, // Empty analysis
            error: analysis.error,
          });
        } else {
          results.push({
            file,
            analysis,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          file,
          analysis: {} as DocumentAnalysis,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Extract people from document analyses
   */
  private async extractPeople(
    documents: DocumentWithAnalysis[],
    familyName: string
  ): Promise<ExtractedPerson[]> {
    const allPeople: ExtractedPerson[] = [];

    for (const doc of documents) {
      if (doc.error || !doc.analysis) continue;

      const people = personExtractionService.extractPeople(
        doc.analysis,
        familyName,
        doc.file.name
      );

      allPeople.push(...people);
    }

    return allPeople;
  }

  /**
   * Place documents in the tree
   */
  private async placeDocuments(
    documents: DocumentWithAnalysis[],
    model: DocumentGraphModel,
    userEmail: string,
    progressCallback: (processed: number, fileName: string) => void
  ): Promise<DocumentWithAnalysis[]> {
    const results: DocumentWithAnalysis[] = [];
    let processed = 0;

    for (const doc of documents) {
      if (doc.error || !doc.analysis) {
        results.push(doc);
        continue;
      }

      progressCallback(++processed, doc.file.name);

      try {
        // Determine placement
        const placementResult = await documentPlacementService.determineDocumentPlacement(
          doc.analysis,
          model
        );

        if ('error' in placementResult) {
          results.push({
            ...doc,
            error: placementResult.error,
          });
          continue;
        }

        doc.placement = placementResult;

        // Handle missing parent (create intermediate folders if needed)
        if (!placementResult.parentNodeId && placementResult.suggestedPath.length > 1) {
          const parentPath = placementResult.suggestedPath.slice(0, -1);
          const parentId = await documentPlacementService.createIntermediateFolders(
            model,
            parentPath
          );

          if (parentId) {
            placementResult.parentNodeId = parentId;
          }
        }

        if (!placementResult.parentNodeId) {
          results.push({
            ...doc,
            error: 'Could not determine parent node for document',
          });
          continue;
        }

        // Create document entity
        const documentEntity = model.addEntity({
          type: 'document',
          label: doc.analysis.summary,
          description: doc.analysis.documentType,
          level: 3,
          parentIds: [placementResult.parentNodeId],
          createdBy: userEmail,
          modifiedBy: userEmail,
          metadata: {
            documentType: doc.analysis.documentType,
            extractedData: doc.analysis.extractedData,
            placementConfidence: placementResult.confidence,
            placementReasoning: placementResult.reasoning,
            fileName: doc.file.name,
            fileSize: doc.file.size,
            mimeType: doc.file.type,
          },
          tags: [doc.analysis.documentType, 'uploaded'],
          documents: [], // File will be uploaded separately by GoogleDriveDataService
        });

        results.push({
          ...doc,
          entity: documentEntity,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          ...doc,
          error: errorMessage,
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const lifemapBuilderService = LifemapBuilderService.getInstance();
