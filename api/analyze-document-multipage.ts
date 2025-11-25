/**
 * Vercel Serverless Function: Analyze Multi-Page Document
 *
 * POST /api/analyze-document-multipage
 *
 * Uses OpenAI Vision API to analyze multi-page documents (like PDFs converted to images)
 * by sending multiple images in a single request for synthesized analysis.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  AnalyzeMultipageRequest,
  AnalyzeMultipageResponse,
  MultipageDocumentAnalysis,
} from './_types/api-types';
import { validateAnalyzeMultipageRequest } from './_lib/validators';
import {
  getOpenAIClient,
  getOpenAIConfig,
  getMultipageDocumentAnalysisPrompt,
  parseAIJSONResponse,
} from './_lib/openai-client';

/**
 * Main handler for multi-page document analysis
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
    const validation = validateAnalyzeMultipageRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const {
      pages,
      fileName,
      totalPageCount,
      analyzedPageNumbers
    } = req.body as AnalyzeMultipageRequest;

    console.log(`[analyze-multipage] Analyzing: ${fileName} (${pages.length} pages of ${totalPageCount} total)`);

    // Initialize OpenAI client (server-side, secure)
    const openai = getOpenAIClient();
    const config = getOpenAIConfig();

    // Build message content with multiple images
    const messageContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } }
    > = [
      {
        type: 'text',
        text: getMultipageDocumentAnalysisPrompt(totalPageCount, analyzedPageNumbers),
      },
    ];

    // Add each page image
    for (const page of pages) {
      const dataURL = `data:${page.mimeType};base64,${page.image}`;
      messageContent.push({
        type: 'image_url',
        image_url: {
          url: dataURL,
          detail: 'high', // High detail for document analysis
        },
      });
    }

    console.log(`[analyze-multipage] Sending ${pages.length} images to OpenAI Vision API`);

    // Call OpenAI Vision API with multiple images
    const completion = await openai.chat.completions.create({
      model: config.visionModel,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      max_tokens: config.maxTokens.analysis * 2, // Double tokens for multi-page
      temperature: config.temperature,
    });

    // Extract response
    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    console.log(`[analyze-multipage] Raw AI response: ${responseContent.substring(0, 300)}...`);

    // Parse JSON response
    const analysis = parseAIJSONResponse<MultipageDocumentAnalysis>(responseContent);

    // Validate parsed response has required fields
    if (!analysis.summary || !analysis.documentType || typeof analysis.confidence !== 'number') {
      throw new Error('Invalid analysis response structure');
    }

    // Ensure confidence is within 0-100
    analysis.confidence = Math.max(0, Math.min(100, analysis.confidence || 0));

    // Ensure pageAnalysis is present
    if (!analysis.pageAnalysis) {
      analysis.pageAnalysis = {
        pagesAnalyzed: analyzedPageNumbers,
        totalPages: totalPageCount,
      };
    }

    console.log(`[analyze-multipage] Success: ${analysis.documentType} (${analysis.confidence}% confidence)`);
    console.log(`[analyze-multipage] Person names found: ${analysis.personNames?.join(', ') || 'none'}`);

    // Return success response
    const response: AnalyzeMultipageResponse = {
      success: true,
      data: analysis,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[analyze-multipage] Error:', error);

    // Handle specific OpenAI errors
    let errorMessage = error.message || 'Failed to analyze document';

    if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('context length')) {
      errorMessage = 'Document too large or complex for analysis. Try with fewer pages.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Analysis timed out. The document may be too complex.';
    }

    // Return error response
    const response: AnalyzeMultipageResponse = {
      success: false,
      error: errorMessage,
    };

    res.status(500).json(response);
  }
}
