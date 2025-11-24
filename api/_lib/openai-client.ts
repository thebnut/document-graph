/**
 * Shared OpenAI client setup for serverless functions
 * Securely initializes OpenAI with server-side API key
 */

import OpenAI from 'openai';

// OpenAI client configuration
const OPENAI_CONFIG = {
  model: 'gpt-4o',
  visionModel: 'gpt-4o',
  maxTokens: {
    analysis: 2000,
    placement: 1000,
  },
  temperature: 0.2, // Lower for consistent results
  timeout: 45000,   // 45 seconds for image processing
};

/**
 * Initialize OpenAI client with server-side API key
 * The API key is read from environment variables (OPENAI_API_KEY)
 * NOT from REACT_APP_OPENAI_API_KEY (client-side)
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. ' +
      'Please configure it in Vercel dashboard.'
    );
  }

  return new OpenAI({
    apiKey,
    timeout: OPENAI_CONFIG.timeout,
  });
}

/**
 * Get OpenAI configuration
 */
export function getOpenAIConfig() {
  return OPENAI_CONFIG;
}

/**
 * Clean AI response by removing markdown code blocks
 */
export function cleanAIResponse(response: string): string {
  let cleaned = response.trim();

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');

  return cleaned.trim();
}

/**
 * Parse JSON response from OpenAI with error handling
 */
export function parseAIJSONResponse<T>(response: string): T {
  const cleaned = cleanAIResponse(response);

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('Failed to parse AI response:', cleaned);
    throw new Error('Invalid JSON response from AI');
  }
}

/**
 * Get document analysis prompt
 */
export function getDocumentAnalysisPrompt(): string {
  return `Analyze this document image/PDF and provide:

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
}`;
}

/**
 * Get document placement prompt
 */
export function getDocumentPlacementPrompt(
  documentAnalysis: string,
  graphStructure: string
): string {
  return `Based on the document analysis and the current document graph structure, determine where this document should be placed.

Document Analysis:
${documentAnalysis}

Current Document Graph Structure:
${graphStructure}

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
}`;
}
