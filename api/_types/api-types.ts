/**
 * Shared TypeScript types for API endpoints
 * Used by both serverless functions and frontend API client
 */

// ============================================================================
// Document Analysis Types
// ============================================================================

export interface AnalyzeDocumentRequest {
  file: string;           // base64-encoded file content
  mimeType: string;       // e.g., "image/jpeg", "application/pdf"
  fileName: string;       // e.g., "passport.jpg"
}

export interface DocumentAnalysis {
  summary: string;
  documentType: string;
  extractedData: Record<string, any>;
  confidence: number;
}

export interface AnalyzeDocumentResponse {
  success: boolean;
  data?: DocumentAnalysis;
  error?: string;
}

// ============================================================================
// Document Placement Types
// ============================================================================

export interface DeterminePlacementRequest {
  analysis: DocumentAnalysis;
  treeStructure: string;  // JSON stringified tree structure
}

export interface PlacementDecision {
  parentNodeId: string | null;
  suggestedPath: string[];
  confidence: number;
  reasoning: string;
  createNewParent?: {
    label: string;
    type: string;
    level: number;
  };
}

export interface DeterminePlacementResponse {
  success: boolean;
  data?: PlacementDecision;
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  error: string;
  code?: string;
  details?: any;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
