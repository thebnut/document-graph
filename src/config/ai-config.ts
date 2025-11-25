/**
 * AI Configuration for Document Analysis
 * Configures OpenAI and document processing settings
 *
 * NOTE: OpenAI API key is now managed server-side in serverless functions.
 * This config only contains client-side settings and prompts.
 */

export interface AIConfig {
  openai: {
    model: string;
    visionModel: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  documentProcessing: {
    maxFileSize: number;
    supportedFormats: string[];
    confidenceLevels: {
      high: number;
      medium: number;
      low: number;
    };
  };
  pdfProcessing: {
    maxPagesPerRequest: number;
    maxTotalPages: number;
    targetImageWidth: number;
    jpegQuality: number;
    pageSelectionStrategy: 'smart' | 'all' | 'first_only';
  };
  prompts: {
    documentAnalysis: string;
    documentPlacement: string;
    multipageDocumentAnalysis: string;
  };
  debug: boolean;
}

export const AI_CONFIG: AIConfig = {
  openai: {
    model: 'gpt-4o',
    visionModel: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.2, // Lower for more consistent results
    timeout: 45000 // 45 seconds for image processing
  },
  documentProcessing: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    supportedFormats: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf', // PDFs converted to images via pdfProcessingService
    ],
    confidenceLevels: {
      high: 80,   // Auto-create node
      medium: 60, // Suggest but require confirmation
      low: 0      // Manual review required
    }
  },
  pdfProcessing: {
    maxPagesPerRequest: 8,     // Max pages to send in single API request
    maxTotalPages: 20,         // Hard limit - reject PDFs with more pages
    targetImageWidth: 1200,    // Target width for page images (px)
    jpegQuality: 0.85,         // JPEG quality (0-1)
    pageSelectionStrategy: 'smart' // 'smart' | 'all' | 'first_only'
  },
  prompts: {
    documentAnalysis: `Analyze this document image/PDF and provide:

1. A single sentence summary starting with "The" that identifies what this document is and who it belongs to (e.g., "The passport for Harry Styles")

2. Document type classification (e.g., passport, insurance_auto, insurance_health, medical_record, financial_statement, utility_bill, tax_document, education_certificate, etc.)

3. Extract ALL relevant information you can identify in the document. Be comprehensive and include any data that might be useful. Return as nested JSON structure appropriate to the document type.

Examples of what to extract:
- For a passport: holder details (name, DOB, nationality), document details (number, issue/expiry dates), etc.
- For insurance: policy holder, insurer details, policy info, coverage details, premiums, etc.
- For medical: patient info, diagnoses, medications, doctor details, test results, etc.
- For financial: account details, transactions, balances, institution info, etc.

Be thorough - extract anything that seems important. Structure the data logically with meaningful keys.

Return ONLY a raw JSON object with this exact structure. Do not include markdown formatting, code blocks, or any other text. Just the JSON object:
{
  "summary": "The [document type] for [person name]",
  "documentType": "classification_here",
  "extractedData": {
    // Nested structure appropriate to document type
  },
  "confidence": 0-100
}`,
    documentPlacement: `Based on the document analysis and the current document graph structure, determine where this document should be placed.

Document Analysis:
{documentAnalysis}

Current Document Graph Structure:
{graphStructure}

Determine:
1. The parent node ID where this document should be attached
2. The full suggested path from root to the placement location
3. A confidence score (0-100) for this placement decision
4. A brief reasoning for the placement

If no suitable location exists, suggest creating new folders in the path.

Return ONLY a raw JSON object with this structure. Do not include markdown formatting, code blocks, or any other text. Just the JSON object:
{
  "parentNodeId": "id-of-parent-node",
  "suggestedPath": ["Person Name", "Category", "Subcategory"],
  "confidence": 0-100,
  "reasoning": "Brief explanation of placement decision"
}`,
    multipageDocumentAnalysis: `You are analyzing a MULTI-PAGE document. This document has {totalPages} pages total, and you are seeing pages {pageNumbers}.

IMPORTANT: Synthesize information across ALL provided pages to create a unified analysis.

When analyzing multi-page documents:
1. Look for document type indicators (headers, titles, logos) - often on page 1
2. Extract key data from throughout the document
3. Look for signatures, dates, and totals - often on the last page
4. For forms/applications: combine data from all visible pages
5. For statements/reports: look for summary sections

Provide:
1. A single sentence summary starting with "The" that identifies what this document is and who it belongs to

2. Document type classification (e.g., passport, insurance_auto, insurance_health, medical_record, financial_statement, utility_bill, tax_document, education_certificate, contract, etc.)

3. Extract ALL relevant information from ALL pages. Be comprehensive. Structure as nested JSON appropriate to document type.

4. Note which page key information came from when relevant.

Return ONLY a raw JSON object with this exact structure. Do not include markdown formatting, code blocks, or any other text:
{
  "summary": "The [document type] for [person name]",
  "documentType": "classification_here",
  "extractedData": {
    // Comprehensive nested structure with data from all pages
  },
  "confidence": 0-100,
  "personNames": ["Name1", "Name2"],
  "pageAnalysis": {
    "pagesAnalyzed": [1, 5, 10],
    "totalPages": 10,
    "keyPagesIdentified": [1, 10],
    "potentialMissingInfo": "Note if important data might be on unanalyzed pages"
  }
}`
  },
  debug: true // Enable debugging by default
};

// Note: OpenAI API key validation is handled server-side in serverless functions