/**
 * Vercel Serverless Function: Determine Document Placement
 *
 * POST /api/determine-placement
 *
 * Uses OpenAI to determine optimal placement location for
 * analyzed documents in the document tree structure.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  DeterminePlacementRequest,
  DeterminePlacementResponse,
  PlacementDecision,
} from './_types/api-types';
import { validateDeterminePlacementRequest } from './_lib/validators';
import {
  getOpenAIClient,
  getOpenAIConfig,
  getDocumentPlacementPrompt,
  parseAIJSONResponse,
} from './_lib/openai-client';

/**
 * Main handler for placement determination
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
    const validation = validateDeterminePlacementRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { analysis, treeStructure } = req.body as DeterminePlacementRequest;

    console.log(
      `[determine-placement] Determining placement for: ${analysis.documentType} "${analysis.summary}"`
    );

    // Initialize OpenAI client (server-side, secure)
    const openai = getOpenAIClient();
    const config = getOpenAIConfig();

    // Build prompt with analysis and tree structure
    const prompt = getDocumentPlacementPrompt(
      JSON.stringify(analysis, null, 2),
      treeStructure
    );

    // Call OpenAI Text API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: config.maxTokens.placement,
      temperature: config.temperature,
    });

    // Extract response
    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    console.log(`[determine-placement] Raw AI response: ${responseContent.substring(0, 200)}...`);

    // Parse JSON response
    const placement = parseAIJSONResponse<PlacementDecision>(responseContent);

    // Validate parsed response has required fields
    if (
      !Array.isArray(placement.suggestedPath) ||
      typeof placement.confidence !== 'number' ||
      !placement.reasoning
    ) {
      throw new Error('Invalid placement response structure');
    }

    console.log(
      `[determine-placement] Success: ${placement.suggestedPath.join(' > ')} (${placement.confidence}% confidence)`
    );

    // Return success response
    const response: DeterminePlacementResponse = {
      success: true,
      data: placement,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[determine-placement] Error:', error);

    // Return error response
    const response: DeterminePlacementResponse = {
      success: false,
      error: error.message || 'Failed to determine placement',
    };

    res.status(500).json(response);
  }
}
