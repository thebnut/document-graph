/**
 * Tests for Document Placement Service
 */

import { createMockDocumentGraph, createMockAIAnalysis } from '../../test-utils';
import { AI_CONFIG } from '../../config/ai-config';
import { DocumentGraphModel } from '../../data/standalone-model-implementation';

// Mock OpenAI
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: (...args: any[]) => mockCreate(...args),
        },
      },
    })),
  };
});

// Import after mocking
import { documentPlacementService, PlacementDecision, PlacementError } from '../documentPlacementService';

describe('DocumentPlacementService', () => {
  let model: DocumentGraphModel;

  beforeAll(() => {
    // Set up AI config
    (AI_CONFIG as any).openai.apiKey = 'test-api-key';

    // Ensure service has OpenAI client
    const OpenAI = require('openai').default;
    (documentPlacementService as any).openai = new OpenAI({ apiKey: 'test-api-key', dangerouslyAllowBrowser: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh model for each test
    const mockGraph = createMockDocumentGraph();
    model = new DocumentGraphModel(mockGraph);
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = (documentPlacementService as any).constructor.getInstance();
      const instance2 = (documentPlacementService as any).constructor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      expect(documentPlacementService.isAvailable()).toBe(true);
    });
  });

  describe('buildTreeStructure', () => {
    it('should build a tree structure from the model', () => {
      const treeStructure = (documentPlacementService as any).buildTreeStructure(model);

      expect(typeof treeStructure).toBe('string');
      expect(() => JSON.parse(treeStructure)).not.toThrow();

      const parsed = JSON.parse(treeStructure);
      expect(parsed).toHaveProperty('Test Person');
    });

    it('should include entity IDs and types in tree structure', () => {
      const treeStructure = (documentPlacementService as any).buildTreeStructure(model);
      const parsed = JSON.parse(treeStructure);

      const testPerson = parsed['Test Person'];
      expect(testPerson).toHaveProperty('id');
      expect(testPerson).toHaveProperty('type');
      expect(testPerson.type).toBe('person');
    });

    it('should include nested children in tree structure', () => {
      const treeStructure = (documentPlacementService as any).buildTreeStructure(model);
      const parsed = JSON.parse(treeStructure);

      const testPerson = parsed['Test Person'];
      expect(testPerson).toHaveProperty('children');
      expect(testPerson.children).toHaveProperty('Documents');
    });
  });

  describe('findNodeByPath', () => {
    it('should find a node by path', () => {
      const path = ['Test Person', 'Documents'];
      const node = (documentPlacementService as any).findNodeByPath(model, path);

      expect(node).toBeTruthy();
      expect(node.label).toBe('Documents');
    });

    it('should return null for empty path', () => {
      const node = (documentPlacementService as any).findNodeByPath(model, []);
      expect(node).toBeNull();
    });

    it('should return null for non-existent path', () => {
      const path = ['NonExistent', 'Path'];
      const node = (documentPlacementService as any).findNodeByPath(model, path);

      expect(node).toBeNull();
    });

    it('should handle partial paths correctly', () => {
      const path = ['Test Person'];
      const node = (documentPlacementService as any).findNodeByPath(model, path);

      expect(node).toBeTruthy();
      expect(node.label).toBe('Test Person');
      expect(node.type).toBe('person');
    });
  });

  describe('cleanAIResponse', () => {
    it('should remove markdown code blocks with json marker', () => {
      const mockResponse = {
        parentNodeId: 'test-id',
        suggestedPath: ['Test', 'Path'],
        confidence: 90,
        reasoning: 'Test reasoning',
      };

      const withMarkdown = '```json\n' + JSON.stringify(mockResponse) + '\n```';
      const cleaned = (documentPlacementService as any).cleanAIResponse(withMarkdown);

      const parsed = JSON.parse(cleaned);
      expect(parsed.parentNodeId).toBe('test-id');
    });

    it('should remove markdown code blocks without json marker', () => {
      const mockResponse = {
        parentNodeId: 'test-id',
        suggestedPath: ['Test', 'Path'],
        confidence: 90,
        reasoning: 'Test reasoning',
      };

      const withMarkdown = '```\n' + JSON.stringify(mockResponse) + '\n```';
      const cleaned = (documentPlacementService as any).cleanAIResponse(withMarkdown);

      const parsed = JSON.parse(cleaned);
      expect(parsed.parentNodeId).toBe('test-id');
    });

    it('should handle plain JSON without markdown', () => {
      const mockResponse = {
        parentNodeId: 'test-id',
        suggestedPath: ['Test', 'Path'],
        confidence: 90,
        reasoning: 'Test reasoning',
      };

      const jsonString = JSON.stringify(mockResponse);
      const cleaned = (documentPlacementService as any).cleanAIResponse(jsonString);

      const parsed = JSON.parse(cleaned);
      expect(parsed.parentNodeId).toBe('test-id');
    });
  });

  describe('determineDocumentPlacement', () => {
    const mockAnalysis = createMockAIAnalysis();

    beforeEach(() => {
      // Mock successful OpenAI response
      const mockDecision = {
        parentNodeId: 'folder-1',
        suggestedPath: ['Test Person', 'Documents', 'Test Document'],
        confidence: 95,
        reasoning: 'This is a test document that belongs in the Documents folder',
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockDecision),
            },
          },
        ],
      });
    });

    it('should return error when service is not available', async () => {
      (documentPlacementService as any).openai = null;

      const result = await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect('error' in result).toBe(true);
      expect((result as PlacementError).error).toBe('OpenAI API key not configured');

      // Restore
      const OpenAI = require('openai').default;
      (documentPlacementService as any).openai = new OpenAI({ apiKey: 'test-api-key', dangerouslyAllowBrowser: true });
    });

    it('should call OpenAI with correct parameters', async () => {
      await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect(mockCreate).toHaveBeenCalledWith({
        model: AI_CONFIG.openai.model,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Brett Thebault'), // From mock analysis
          },
        ],
        max_tokens: 1000,
        temperature: AI_CONFIG.openai.temperature,
      });
    });

    it('should handle empty AI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect('error' in result).toBe(true);
      expect((result as PlacementError).error).toBe('No response from AI model');
    });

    it('should handle invalid JSON in AI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not valid json' } }],
      });

      const result = await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect('error' in result).toBe(true);
      expect((result as PlacementError).error).toContain('Failed to parse placement decision');
    });

    it('should handle invalid decision structure', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ reasoning: 'Test' }), // Missing required fields
            },
          },
        ],
      });

      const result = await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect('error' in result).toBe(true);
      expect((result as PlacementError).error).toBe('Invalid placement decision structure');
    });

    it('should clamp confidence values to 0-100 range', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                parentNodeId: 'folder-1',
                suggestedPath: ['Test', 'Path'],
                confidence: 150, // Over 100
                reasoning: 'Test',
              }),
            },
          },
        ],
      });

      const result = await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect('error' in result).toBe(false);
      expect((result as PlacementDecision).confidence).toBe(100);
    });

    it('should handle negative confidence values', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                parentNodeId: 'folder-1',
                suggestedPath: ['Test', 'Path'],
                confidence: -10, // Negative
                reasoning: 'Test',
              }),
            },
          },
        ],
      });

      const result = await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect('error' in result).toBe(false);
      expect((result as PlacementDecision).confidence).toBe(0);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await documentPlacementService.determineDocumentPlacement(mockAnalysis, model);

      expect('error' in result).toBe(true);
      expect((result as PlacementError).error).toContain('Placement failed');
    });
  });
});
