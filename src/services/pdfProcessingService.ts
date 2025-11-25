/**
 * PDF Processing Service
 * Handles PDF to image conversion using pdfjs-dist (lazy-loaded)
 *
 * Features:
 * - Lazy loading: pdfjs-dist only loaded when first PDF is processed
 * - Smart page selection: Analyzes key pages based on document size
 * - JPEG output: Smaller than PNG for efficient API transmission
 * - Progress callbacks: Real-time feedback during processing
 */

import { AI_CONFIG } from '../config/ai-config';

// Types for pdfjs-dist (lazy-loaded)
type PDFDocumentProxy = import('pdfjs-dist').PDFDocumentProxy;
type PDFPageProxy = import('pdfjs-dist').PDFPageProxy;

export interface PDFPageImage {
  pageNumber: number;
  base64: string;
  width: number;
  height: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  pageCount: number;
  isEncrypted: boolean;
}

export interface PDFProcessingResult {
  pageCount: number;
  pages: PDFPageImage[];
  selectedPageNumbers: number[];
  metadata: PDFMetadata;
}

export interface PDFProcessingOptions {
  maxPages?: number;
  targetWidth?: number;
  jpegQuality?: number;
  onProgress?: (phase: string, current: number, total: number) => void;
}

export interface PDFProcessingError {
  error: string;
  code: 'ENCRYPTED' | 'CORRUPTED' | 'EMPTY' | 'TOO_MANY_PAGES' | 'LOAD_FAILED' | 'RENDER_FAILED';
}

// Lazy-loaded pdfjs module
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
let pdfjsLoadPromise: Promise<typeof import('pdfjs-dist')> | null = null;

/**
 * Lazily load pdfjs-dist module
 * Only loads the library when first PDF is processed
 */
async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsLib) {
    return pdfjsLib;
  }

  if (pdfjsLoadPromise) {
    return pdfjsLoadPromise;
  }

  pdfjsLoadPromise = (async () => {
    const pdfjs = await import('pdfjs-dist');

    // Configure worker from CDN for better compatibility
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

    pdfjsLib = pdfjs;
    return pdfjs;
  })();

  return pdfjsLoadPromise;
}

export class PDFProcessingService {
  private static instance: PDFProcessingService | null = null;

  private constructor() {}

  static getInstance(): PDFProcessingService {
    if (!PDFProcessingService.instance) {
      PDFProcessingService.instance = new PDFProcessingService();
    }
    return PDFProcessingService.instance;
  }

  /**
   * Check if a file is a PDF
   */
  isPDF(file: File): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Select which pages to analyze based on page count
   * Uses smart selection strategy from config
   */
  selectPagesForAnalysis(pageCount: number): number[] {
    const config = AI_CONFIG.pdfProcessing;
    const maxPages = config?.maxPagesPerRequest || 8;
    const maxTotalPages = config?.maxTotalPages || 20;

    // Reject if over limit
    if (pageCount > maxTotalPages) {
      return []; // Will trigger error in processPDF
    }

    // 1-4 pages: analyze all
    if (pageCount <= 4) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    // 5-10 pages: first, last, + evenly distributed (~6 pages)
    if (pageCount <= 10) {
      const selected = new Set<number>();
      selected.add(1); // First page
      selected.add(pageCount); // Last page

      // Add evenly distributed pages
      const step = Math.floor((pageCount - 2) / 4);
      for (let i = 1; i <= 4 && selected.size < Math.min(6, pageCount); i++) {
        selected.add(Math.min(1 + i * step, pageCount - 1));
      }

      return Array.from(selected).sort((a, b) => a - b);
    }

    // 11-20 pages: first 2, last 2, + 4 distributed (~8 pages max)
    const selected = new Set<number>();
    selected.add(1);
    selected.add(2);
    selected.add(pageCount - 1);
    selected.add(pageCount);

    // Add 4 evenly distributed from middle
    const middleStart = 3;
    const middleEnd = pageCount - 2;
    const middleRange = middleEnd - middleStart;

    if (middleRange > 0) {
      const step = Math.floor(middleRange / 5);
      for (let i = 1; i <= 4 && selected.size < maxPages; i++) {
        const page = Math.min(middleStart + i * step, middleEnd);
        selected.add(page);
      }
    }

    return Array.from(selected).sort((a, b) => a - b).slice(0, maxPages);
  }

  /**
   * Process a PDF file and convert selected pages to images
   */
  async processPDF(
    file: File,
    options: PDFProcessingOptions = {}
  ): Promise<PDFProcessingResult | PDFProcessingError> {
    const config = AI_CONFIG.pdfProcessing;
    const {
      // maxPages is currently handled by selectPagesForAnalysis based on config
      targetWidth = config?.targetImageWidth || 1200,
      jpegQuality = config?.jpegQuality || 0.85,
      onProgress
    } = options;

    try {
      onProgress?.('loading', 0, 1);

      // Lazy load pdfjs
      const pdfjs = await loadPdfJs();

      // Load PDF from file
      const arrayBuffer = await file.arrayBuffer();

      let pdf: PDFDocumentProxy;
      try {
        pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      } catch (loadError: any) {
        if (loadError.message?.includes('password')) {
          return { error: 'PDF is password-protected', code: 'ENCRYPTED' };
        }
        return { error: 'Unable to read PDF file', code: 'CORRUPTED' };
      }

      const pageCount = pdf.numPages;

      // Check for empty PDF
      if (pageCount === 0) {
        return { error: 'PDF has no pages', code: 'EMPTY' };
      }

      // Check page limit
      const maxTotalPages = config?.maxTotalPages || 20;
      if (pageCount > maxTotalPages) {
        return {
          error: `PDF exceeds ${maxTotalPages} page limit (has ${pageCount} pages)`,
          code: 'TOO_MANY_PAGES'
        };
      }

      // Get metadata
      const metadataResult = await pdf.getMetadata().catch(() => null);
      const metadata: PDFMetadata = {
        title: (metadataResult?.info as any)?.Title || undefined,
        author: (metadataResult?.info as any)?.Author || undefined,
        pageCount,
        isEncrypted: false
      };

      // Select pages to analyze
      const selectedPageNumbers = this.selectPagesForAnalysis(pageCount);

      onProgress?.('rendering', 0, selectedPageNumbers.length);

      // Render selected pages to images
      const pages: PDFPageImage[] = [];

      for (let i = 0; i < selectedPageNumbers.length; i++) {
        const pageNum = selectedPageNumbers[i];
        onProgress?.('rendering', i + 1, selectedPageNumbers.length);

        try {
          const pageImage = await this.renderPageToImage(
            pdf,
            pageNum,
            targetWidth,
            jpegQuality
          );
          pages.push(pageImage);
        } catch (renderError) {
          console.warn(`Failed to render page ${pageNum}, skipping:`, renderError);
          // Continue with other pages
        }
      }

      // Check if we got any pages
      if (pages.length === 0) {
        return { error: 'Failed to render any pages from PDF', code: 'RENDER_FAILED' };
      }

      onProgress?.('complete', pages.length, pages.length);

      return {
        pageCount,
        pages,
        selectedPageNumbers: pages.map(p => p.pageNumber),
        metadata
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to process PDF',
        code: 'LOAD_FAILED'
      };
    }
  }

  /**
   * Render a single PDF page to a JPEG base64 image
   */
  private async renderPageToImage(
    pdf: PDFDocumentProxy,
    pageNumber: number,
    targetWidth: number,
    jpegQuality: number
  ): Promise<PDFPageImage> {
    const page: PDFPageProxy = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });

    // Calculate scale to achieve target width
    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to create canvas context');
    }

    canvas.width = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);

    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;

    // Convert to JPEG base64 (without data URL prefix)
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
    const base64 = dataUrl.split(',')[1];

    // Cleanup
    canvas.remove();

    return {
      pageNumber,
      base64,
      width: canvas.width,
      height: canvas.height
    };
  }

  /**
   * Get estimated token cost for a multi-page PDF
   * Based on OpenAI's image token calculation
   */
  estimateTokenCost(pageCount: number): number {
    const selectedPages = this.selectPagesForAnalysis(pageCount);
    // Rough estimate: ~1000-1500 tokens per high-detail image
    return selectedPages.length * 1200;
  }
}

// Export singleton instance
export const pdfProcessingService = PDFProcessingService.getInstance();

// Type guard for error results
export function isPDFProcessingError(
  result: PDFProcessingResult | PDFProcessingError
): result is PDFProcessingError {
  return 'error' in result && 'code' in result;
}
