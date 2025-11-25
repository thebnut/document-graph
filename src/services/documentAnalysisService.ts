/**
 * Document Analysis Service
 * Uses OpenAI's multimodal LLM to analyze documents and extract metadata
 *
 * REFACTORED: Now uses serverless API endpoints instead of direct OpenAI calls
 * for improved security (API key is server-side only)
 *
 * ENHANCED: Added multi-page PDF support via pdfProcessingService
 */

import { AI_CONFIG } from '../config/ai-config';
import * as apiClient from './apiClient';
import { APIClientError } from './apiClient';
import {
  pdfProcessingService,
  isPDFProcessingError,
  type PDFProcessingResult,
} from './pdfProcessingService';

export interface DocumentAnalysis {
  summary: string; // Single sentence starting with "The"
  documentType: string; // passport, insurance, medical, etc.
  extractedData: Record<string, any>; // Flexible JSON with all extracted info
  confidence: number; // 0-100
  personNames?: string[]; // Explicit person names extracted from document
  pageAnalysis?: {
    pagesAnalyzed: number[];
    totalPages: number;
    keyPagesIdentified?: number[];
    potentialMissingInfo?: string;
  };
}

export interface AnalysisError {
  error: string;
  details?: any;
}

export class DocumentAnalysisService {
  private static instance: DocumentAnalysisService | null = null;

  private constructor() {
    // No OpenAI client initialization - uses serverless API
  }

  static getInstance(): DocumentAnalysisService {
    if (!DocumentAnalysisService.instance) {
      DocumentAnalysisService.instance = new DocumentAnalysisService();
    }
    return DocumentAnalysisService.instance;
  }

  /**
   * Check if the service is available
   * Always returns true since API endpoints handle authentication
   */
  isAvailable(): boolean {
    return true;
  }
  
  /**
   * Analyze a document using multimodal LLM
   * NOW USES: Serverless API endpoints
   * - Single images: /api/analyze-document
   * - PDFs (multi-page): /api/analyze-document-multipage
   */
  async analyzeDocument(
    file: File,
    onProgress?: (phase: string, current: number, total: number) => void
  ): Promise<DocumentAnalysis | AnalysisError> {
    try {
      // Validate file
      if (!this.isFileSupported(file)) {
        return { error: `Unsupported file type: ${file.type}` };
      }

      if (file.size > AI_CONFIG.documentProcessing.maxFileSize) {
        return {
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: ${
            AI_CONFIG.documentProcessing.maxFileSize / 1024 / 1024
          }MB)`,
        };
      }

      if (AI_CONFIG.debug) {
        console.log('Document Analysis - File info:', {
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }

      // Check if PDF - route through multi-page processing
      if (pdfProcessingService.isPDF(file)) {
        return this.analyzePDFDocument(file, onProgress);
      }

      // Standard image analysis
      onProgress?.('analyzing', 0, 1);

      // Call serverless API endpoint
      const analysis = await apiClient.analyzeDocument(file);

      // Ensure confidence is within 0-100
      analysis.confidence = Math.max(0, Math.min(100, analysis.confidence || 0));

      onProgress?.('complete', 1, 1);

      if (AI_CONFIG.debug) {
        console.log('Document Analysis - Success:', analysis);
      }

      return analysis;
    } catch (error) {
      console.error('Document analysis error:', error);

      // Handle API client errors
      if (error instanceof APIClientError) {
        if (error.message.includes('rate limit')) {
          return { error: 'Rate limit exceeded. Please try again later.' };
        }
        if (error.message.includes('context length')) {
          return { error: 'Document too complex for analysis.' };
        }
        if (error.message.includes('too large')) {
          return { error: 'File too large for analysis.' };
        }

        return { error: error.message, details: error.details };
      }

      if (error instanceof Error) {
        return { error: `Analysis failed: ${error.message}` };
      }

      return { error: 'Unknown error during document analysis' };
    }
  }

  /**
   * Analyze a PDF document with multi-page support
   * Converts PDF pages to images, then sends to multi-page analysis endpoint
   */
  private async analyzePDFDocument(
    file: File,
    onProgress?: (phase: string, current: number, total: number) => void
  ): Promise<DocumentAnalysis | AnalysisError> {
    if (AI_CONFIG.debug) {
      console.log('Document Analysis - Processing PDF:', file.name);
    }

    // Process PDF to images
    const pdfResult = await pdfProcessingService.processPDF(file, {
      onProgress: (phase, current, total) => {
        if (phase === 'rendering') {
          onProgress?.('rendering', current, total);
        }
      },
    });

    // Check for PDF processing errors
    if (isPDFProcessingError(pdfResult)) {
      return { error: pdfResult.error, details: { code: pdfResult.code } };
    }

    const result = pdfResult as PDFProcessingResult;

    if (AI_CONFIG.debug) {
      console.log('Document Analysis - PDF processed:', {
        totalPages: result.pageCount,
        analyzedPages: result.selectedPageNumbers,
        metadata: result.metadata,
      });
    }

    onProgress?.('analyzing', 0, result.pages.length);

    // Call multi-page analysis endpoint
    const analysis = await apiClient.analyzeDocumentMultipage(
      result.pages,
      file.name,
      result.pageCount
    );

    // Ensure confidence is within 0-100
    analysis.confidence = Math.max(0, Math.min(100, analysis.confidence || 0));

    onProgress?.('complete', result.pages.length, result.pages.length);

    if (AI_CONFIG.debug) {
      console.log('Document Analysis - PDF Success:', {
        documentType: analysis.documentType,
        confidence: analysis.confidence,
        personNames: analysis.personNames,
        pageAnalysis: analysis.pageAnalysis,
      });
    }

    return analysis;
  }
  
  /**
   * Check if file type is supported
   */
  private isFileSupported(file: File): boolean {
    return AI_CONFIG.documentProcessing.supportedFormats.includes(file.type);
  }
  
  /**
   * Get supported file formats
   */
  getSupportedFormats(): string[] {
    return AI_CONFIG.documentProcessing.supportedFormats;
  }
  
  /**
   * Get confidence level interpretation
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    const levels = AI_CONFIG.documentProcessing.confidenceLevels;
    if (confidence >= levels.high) return 'high';
    if (confidence >= levels.medium) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const documentAnalysisService = DocumentAnalysisService.getInstance();