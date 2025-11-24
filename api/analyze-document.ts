/**
 * Vercel Serverless Function: Analyze Document
 *
 * POST /api/analyze-document
 *
 * Uses OpenAI Vision API to analyze document images/PDFs
 * and extract metadata securely server-side.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  AnalyzeDocumentRequest,
  AnalyzeDocumentResponse,
  DocumentAnalysis,
} from './_types/api-types';
import { validateAnalyzeDocumentRequest } from './_lib/validators';
import {
  getOpenAIClient,
  getOpenAIConfig,
  getDocumentAnalysisPrompt,
  parseAIJSONResponse,
} from './_lib/openai-client';

/**
 * Main handler for document analysis
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    // Validate request body
    const validation = validateAnalyzeDocumentRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { file, mimeType, fileName } = req.body as AnalyzeDocumentRequest;

    console.log(`[analyze-document] Analyzing: ${fileName} (${mimeType})`);

    // Initialize OpenAI client (server-side, secure)
    const openai = getOpenAIClient();
    const config = getOpenAIConfig();

    // Build data URL for OpenAI Vision API
    const dataURL = `data:${mimeType};base64,${file}`;

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: config.visionModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: getDocumentAnalysisPrompt(),
            },
            {
              type: 'image_url',
              image_url: {
                url: dataURL,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: config.maxTokens.analysis,
      temperature: config.temperature,
    });

    // Extract response
    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    console.log(`[analyze-document] Raw AI response: ${responseContent.substring(0, 200)}...`);

    // Parse JSON response
    const analysis = parseAIJSONResponse<DocumentAnalysis>(responseContent);

    // Validate parsed response has required fields
    if (!analysis.summary || !analysis.documentType || typeof analysis.confidence !== 'number') {
      throw new Error('Invalid analysis response structure');
    }

    console.log(`[analyze-document] Success: ${analysis.documentType} (${analysis.confidence}% confidence)`);

    // Return success response
    const response: AnalyzeDocumentResponse = {
      success: true,
      data: analysis,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[analyze-document] Error:', error);

    // Return error response
    const response: AnalyzeDocumentResponse = {
      success: false,
      error: error.message || 'Failed to analyze document',
    };

    res.status(500).json(response);
  }
}
