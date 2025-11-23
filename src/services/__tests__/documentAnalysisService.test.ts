/**
 * Tests for Document Analysis Service
 */

import { createMockFile, createMockAIAnalysis } from '../../test-utils';
import { AI_CONFIG } from '../../config/ai-config';

// Mock OpenAI before importing the service
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
import { documentAnalysisService, DocumentAnalysis, AnalysisError } from '../documentAnalysisService';

describe('DocumentAnalysisService', () => {
  beforeAll(() => {
    // Set up AI config with test API key once
    (AI_CONFIG as any).openai.apiKey = 'test-api-key';

    // Ensure service has OpenAI client
    const OpenAI = require('openai').default;
    (documentAnalysisService as any).openai = new OpenAI({ apiKey: 'test-api-key', dangerouslyAllowBrowser: true });
  });

  beforeEach(() => {
    // Just clear mocks between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = (documentAnalysisService as any).constructor.getInstance();
      const instance2 = (documentAnalysisService as any).constructor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      expect(documentAnalysisService.isAvailable()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      // Create a new instance without API key
      (AI_CONFIG as any).openai.apiKey = '';
      const service = new (documentAnalysisService as any).constructor();

      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('analyzeDocument', () => {
    const mockAnalysis = createMockAIAnalysis();

    beforeEach(() => {
      // Mock successful OpenAI response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
      });
    });

    it('should successfully analyze a supported document', async () => {
      const file = createMockFile({
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024 * 1024, // 1MB
      });

      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(false);
      expect(result).toMatchObject({
        summary: expect.any(String),
        documentType: expect.any(String),
        extractedData: expect.any(Object),
        confidence: expect.any(Number),
      });
    });

    it('should call OpenAI API with correct parameters', async () => {
      const file = createMockFile({
        name: 'test.jpg',
        type: 'image/jpeg',
      });

      await documentAnalysisService.analyzeDocument(file);

      expect(mockCreate).toHaveBeenCalledWith({
        model: AI_CONFIG.openai.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: AI_CONFIG.prompts.documentAnalysis },
              {
                type: 'image_url',
                image_url: {
                  url: expect.stringContaining('data:image/jpeg;base64,'),
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: AI_CONFIG.openai.maxTokens,
        temperature: AI_CONFIG.openai.temperature,
      });
    });

    it('should return error when service is not available', async () => {
      const file = createMockFile();

      // Mock unavailable service
      (documentAnalysisService as any).openai = null;

      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toBe('OpenAI API key not configured');
    });

    it('should reject unsupported file types', async () => {
      const file = createMockFile({
        type: 'text/plain', // Unsupported
      });

      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toContain('Unsupported file type');
    });

    it('should reject files that are too large', async () => {
      const largeFile = createMockFile({
        size: 25 * 1024 * 1024, // 25MB (over limit)
      });

      const result = await documentAnalysisService.analyzeDocument(largeFile);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toContain('File too large');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toContain('Analysis failed');
    });

    it('should handle rate limit errors', async () => {
      mockCreate.mockRejectedValue(new Error('rate limit exceeded'));

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toContain('Rate limit exceeded');
    });

    it('should handle context length errors', async () => {
      mockCreate.mockRejectedValue(new Error('context length exceeded'));

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toContain('Document too complex');
    });

    it('should handle empty AI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toBe('No response from AI model');
    });

    it('should handle invalid JSON in AI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not valid json' } }],
      });

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toContain('Failed to parse AI response');
    });

    it('should handle incomplete analysis structure', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: 'Test' }), // Missing required fields
            },
          },
        ],
      });

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(true);
      expect((result as AnalysisError).error).toBe('Invalid response structure from AI model');
    });

    it('should clamp confidence values to 0-100 range', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...mockAnalysis,
                confidence: 150, // Over 100
              }),
            },
          },
        ],
      });

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(false);
      expect((result as DocumentAnalysis).confidence).toBe(100);
    });

    it('should handle negative confidence values', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...mockAnalysis,
                confidence: -10, // Negative
              }),
            },
          },
        ],
      });

      const file = createMockFile();
      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(false);
      expect((result as DocumentAnalysis).confidence).toBe(0);
    });

    describe('cleanAIResponse', () => {
      it('should remove markdown code blocks with json marker', async () => {
        mockCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: '```json\n' + JSON.stringify(mockAnalysis) + '\n```',
              },
            },
          ],
        });

        const file = createMockFile();
        const result = await documentAnalysisService.analyzeDocument(file);

        expect('error' in result).toBe(false);
        expect((result as DocumentAnalysis).summary).toBeTruthy();
      });

      it('should remove markdown code blocks without json marker', async () => {
        mockCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: '```\n' + JSON.stringify(mockAnalysis) + '\n```',
              },
            },
          ],
        });

        const file = createMockFile();
        const result = await documentAnalysisService.analyzeDocument(file);

        expect('error' in result).toBe(false);
        expect((result as DocumentAnalysis).summary).toBeTruthy();
      });

      it('should handle response with only closing markdown', async () => {
        mockCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(mockAnalysis) + '\n```',
              },
            },
          ],
        });

        const file = createMockFile();
        const result = await documentAnalysisService.analyzeDocument(file);

        expect('error' in result).toBe(false);
        expect((result as DocumentAnalysis).summary).toBeTruthy();
      });
    });

    describe('supported file formats', () => {
      const supportedFormats = [
        { type: 'image/jpeg', name: 'test.jpg' },
        { type: 'image/png', name: 'test.png' },
        { type: 'image/webp', name: 'test.webp' },
        { type: 'application/pdf', name: 'test.pdf' },
      ];

      beforeEach(() => {
        // Set up mock response for these tests
        const mockAnalysis = createMockAIAnalysis();
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
        });
      });

      supportedFormats.forEach(({ type, name }) => {
        it(`should accept ${type} files`, async () => {
          const file = createMockFile({ type, name });
          const result = await documentAnalysisService.analyzeDocument(file);

          expect('error' in result).toBe(false);
        });
      });
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = documentAnalysisService.getSupportedFormats();

      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
      expect(formats).toContain('image/jpeg');
      expect(formats).toContain('application/pdf');
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return "high" for confidence >= 80', () => {
      expect(documentAnalysisService.getConfidenceLevel(80)).toBe('high');
      expect(documentAnalysisService.getConfidenceLevel(95)).toBe('high');
      expect(documentAnalysisService.getConfidenceLevel(100)).toBe('high');
    });

    it('should return "medium" for confidence >= 60 and < 80', () => {
      expect(documentAnalysisService.getConfidenceLevel(60)).toBe('medium');
      expect(documentAnalysisService.getConfidenceLevel(65)).toBe('medium');
      expect(documentAnalysisService.getConfidenceLevel(79)).toBe('medium');
    });

    it('should return "low" for confidence < 60', () => {
      expect(documentAnalysisService.getConfidenceLevel(0)).toBe('low');
      expect(documentAnalysisService.getConfidenceLevel(25)).toBe('low');
      expect(documentAnalysisService.getConfidenceLevel(59)).toBe('low');
    });
  });

  describe('fileToBase64', () => {
    it('should convert file to base64 string', async () => {
      const file = createMockFile({
        content: 'test content',
      });

      // Access private method through any cast
      const base64 = await (documentAnalysisService as any).fileToBase64(file);

      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      // Base64 should not include data URL prefix
      expect(base64).not.toContain('data:');
    });

    it('should handle FileReader errors', async () => {
      const file = createMockFile();

      // Mock FileReader to fail
      const originalFileReader = global.FileReader;
      (global as any).FileReader = class {
        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('FileReader error'));
            }
          }, 0);
        }
        onerror: any;
        onload: any;
      };

      await expect(
        (documentAnalysisService as any).fileToBase64(file)
      ).rejects.toThrow();

      // Restore
      global.FileReader = originalFileReader;
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete document analysis workflow', async () => {
      const passportData = {
        summary: 'The passport for John Doe',
        documentType: 'passport',
        extractedData: {
          holder: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
          },
          document: {
            number: 'P123456789',
            expiryDate: '2030-01-01',
            issueDate: '2020-01-01',
            nationality: 'USA',
          },
        },
        confidence: 95,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(passportData) } }],
      });

      const file = createMockFile({
        name: 'passport.jpg',
        type: 'image/jpeg',
      });

      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(false);
      const analysis = result as DocumentAnalysis;

      expect(analysis.summary).toBe('The passport for John Doe');
      expect(analysis.documentType).toBe('passport');
      expect(analysis.extractedData.holder.fullName).toBe('John Doe');
      expect(analysis.confidence).toBe(95);
      expect(documentAnalysisService.getConfidenceLevel(analysis.confidence)).toBe('high');
    });

    it('should handle insurance document analysis', async () => {
      const insuranceData = {
        summary: 'The car insurance policy for vehicle ABC123',
        documentType: 'insurance',
        extractedData: {
          policyHolder: 'Jane Smith',
          vehicleRegistration: 'ABC123',
          coverageType: 'Comprehensive',
          expiryDate: '2025-06-01',
          provider: 'InsureCo',
        },
        confidence: 88,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(insuranceData) } }],
      });

      const file = createMockFile({
        name: 'insurance.pdf',
        type: 'application/pdf',
      });

      const result = await documentAnalysisService.analyzeDocument(file);

      expect('error' in result).toBe(false);
      const analysis = result as DocumentAnalysis;

      expect(analysis.documentType).toBe('insurance');
      expect(analysis.extractedData.vehicleRegistration).toBe('ABC123');
    });
  });
});
