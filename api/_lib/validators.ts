/**
 * Request validation utilities for API endpoints
 */

import type { ValidationResult, AnalyzeDocumentRequest, DeterminePlacementRequest } from '../_types/api-types';

// File size limits
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_BASE64_SIZE = MAX_FILE_SIZE * 1.37; // Base64 is ~37% larger

// Supported MIME types (OpenAI Vision API only supports images)
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

/**
 * Validate analyze document request
 */
export function validateAnalyzeDocumentRequest(
  body: any
): ValidationResult {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Partial<AnalyzeDocumentRequest>;

  // Validate file
  if (!request.file || typeof request.file !== 'string') {
    return { valid: false, error: 'file (base64 string) is required' };
  }

  // Validate base64 size
  if (request.file.length > MAX_BASE64_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Validate MIME type
  if (!request.mimeType || typeof request.mimeType !== 'string') {
    return { valid: false, error: 'mimeType is required' };
  }

  if (!SUPPORTED_MIME_TYPES.includes(request.mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file type. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`
    };
  }

  // Validate fileName
  if (!request.fileName || typeof request.fileName !== 'string') {
    return { valid: false, error: 'fileName is required' };
  }

  return { valid: true };
}

/**
 * Validate determine placement request
 */
export function validateDeterminePlacementRequest(
  body: any
): ValidationResult {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Partial<DeterminePlacementRequest>;

  // Validate analysis
  if (!request.analysis || typeof request.analysis !== 'object') {
    return { valid: false, error: 'analysis object is required' };
  }

  const { analysis } = request;

  if (!analysis.summary || typeof analysis.summary !== 'string') {
    return { valid: false, error: 'analysis.summary is required' };
  }

  if (!analysis.documentType || typeof analysis.documentType !== 'string') {
    return { valid: false, error: 'analysis.documentType is required' };
  }

  if (typeof analysis.confidence !== 'number') {
    return { valid: false, error: 'analysis.confidence is required' };
  }

  // Validate tree structure
  if (!request.treeStructure || typeof request.treeStructure !== 'string') {
    return { valid: false, error: 'treeStructure (JSON string) is required' };
  }

  // Try to parse JSON
  try {
    JSON.parse(request.treeStructure);
  } catch (error) {
    return { valid: false, error: 'treeStructure must be valid JSON' };
  }

  return { valid: true };
}

/**
 * Validate base64 data URL format
 */
export function validateBase64DataURL(dataURL: string): ValidationResult {
  const base64Pattern = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/;

  if (!base64Pattern.test(dataURL)) {
    return {
      valid: false,
      error: 'Invalid base64 data URL format. Expected: data:mime/type;base64,content'
    };
  }

  return { valid: true };
}

/**
 * Extract MIME type from base64 data URL
 */
export function extractMimeTypeFromDataURL(dataURL: string): string | null {
  const match = dataURL.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  return match ? match[1] : null;
}

/**
 * Sanitize filename for security
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove special characters except dots, dashes, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized;
}
