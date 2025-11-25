/**
 * API Client for Serverless Functions
 *
 * Provides type-safe methods to call serverless functions
 * that interact with OpenAI API securely.
 */

import type {
  AnalyzeDocumentRequest,
  AnalyzeDocumentResponse,
  AnalyzeMultipageRequest,
  AnalyzeMultipageResponse,
  DeterminePlacementRequest,
  DeterminePlacementResponse,
  DocumentAnalysis,
  MultipageDocumentAnalysis,
  PageImage,
  PlacementDecision,
} from '../../api/_types/api-types';
import type { PDFPageImage } from './pdfProcessingService';

// API endpoint configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * API Client Error
 */
export class APIClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * Make a POST request to an API endpoint
 */
async function post<TRequest, TResponse>(
  endpoint: string,
  data: TRequest
): Promise<TResponse> {
  const url = `${API_BASE_URL}/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const json = await response.json();

    // Check if response indicates an error
    if (!response.ok) {
      throw new APIClientError(
        json.error || 'API request failed',
        response.status,
        json
      );
    }

    return json as TResponse;
  } catch (error: any) {
    // Re-throw APIClientError as-is
    if (error instanceof APIClientError) {
      throw error;
    }

    // Network errors or JSON parse errors
    throw new APIClientError(
      `Failed to call ${endpoint}: ${error.message}`,
      undefined,
      error
    );
  }
}

/**
 * Analyze a document using OpenAI Vision API
 *
 * @param file - The file to analyze (will be converted to base64)
 * @returns Document analysis result
 */
export async function analyzeDocument(file: File): Promise<DocumentAnalysis> {
  // Convert file to base64
  const base64 = await fileToBase64(file);

  // Prepare request
  const request: AnalyzeDocumentRequest = {
    file: base64,
    mimeType: file.type,
    fileName: file.name,
  };

  // Call API
  const response = await post<AnalyzeDocumentRequest, AnalyzeDocumentResponse>(
    'analyze-document',
    request
  );

  // Check response
  if (!response.success || !response.data) {
    throw new APIClientError(
      response.error || 'Document analysis failed',
      undefined,
      response
    );
  }

  return response.data;
}

/**
 * Analyze a multi-page document using OpenAI Vision API
 *
 * @param pages - Array of page images (from pdfProcessingService)
 * @param fileName - Original file name
 * @param totalPageCount - Total pages in original document
 * @returns Multi-page document analysis result
 */
export async function analyzeDocumentMultipage(
  pages: PDFPageImage[],
  fileName: string,
  totalPageCount: number
): Promise<MultipageDocumentAnalysis> {
  // Convert PDFPageImage to PageImage format for API
  const apiPages: PageImage[] = pages.map((page) => ({
    pageNumber: page.pageNumber,
    image: page.base64,
    mimeType: 'image/jpeg', // pdfProcessingService outputs JPEG
  }));

  // Prepare request
  const request: AnalyzeMultipageRequest = {
    pages: apiPages,
    fileName,
    totalPageCount,
    analyzedPageNumbers: pages.map((p) => p.pageNumber),
  };

  // Call API
  const response = await post<AnalyzeMultipageRequest, AnalyzeMultipageResponse>(
    'analyze-document-multipage',
    request
  );

  // Check response
  if (!response.success || !response.data) {
    throw new APIClientError(
      response.error || 'Multi-page document analysis failed',
      undefined,
      response
    );
  }

  return response.data;
}

/**
 * Determine optimal placement for a document in the tree
 *
 * @param analysis - The document analysis result
 * @param treeStructure - The current tree structure (as JSON string)
 * @returns Placement decision
 */
export async function determinePlacement(
  analysis: DocumentAnalysis,
  treeStructure: string
): Promise<PlacementDecision> {
  // Prepare request
  const request: DeterminePlacementRequest = {
    analysis,
    treeStructure,
  };

  // Call API
  const response = await post<DeterminePlacementRequest, DeterminePlacementResponse>(
    'determine-placement',
    request
  );

  // Check response
  if (!response.success || !response.data) {
    throw new APIClientError(
      response.error || 'Placement determination failed',
      undefined,
      response
    );
  }

  return response.data;
}

/**
 * Convert a File to base64 string
 *
 * @param file - The file to convert
 * @returns Base64-encoded file content (without data URL prefix)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:mime/type;base64,)
      const base64 = result.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Check if a file type is supported for analysis
 *
 * @param file - The file to check
 * @returns true if supported, false otherwise
 */
export function isFileSupported(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf', // PDFs converted to images via pdfProcessingService
  ];

  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Check if a file is a PDF
 *
 * @param file - The file to check
 * @returns true if PDF, false otherwise
 */
export function isPDF(file: File): boolean {
  return file.type.toLowerCase() === 'application/pdf';
}

// Export types for convenience
export type { DocumentAnalysis, MultipageDocumentAnalysis, PlacementDecision };
