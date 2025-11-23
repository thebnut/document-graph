/**
 * Mock OpenAI API
 *
 * Mocks the OpenAI client for testing.
 */

export const mockOpenAIResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4-vision-preview',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: JSON.stringify({
          summary: 'Test document summary',
          documentType: 'passport',
          extractedData: {
            holder: {
              fullName: 'Test Person',
              dateOfBirth: '1990-01-01',
            },
            document: {
              number: 'ABC123456',
              expiryDate: '2030-01-01',
            },
          },
          confidence: 95,
        }),
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
};

export const mockChatCompletions = {
  create: jest.fn(() => Promise.resolve(mockOpenAIResponse)),
};

export const mockChat = {
  completions: mockChatCompletions,
};

export class MockOpenAI {
  apiKey: string;
  chat = mockChat;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }
}

// Mock the OpenAI module
jest.mock('openai', () => ({
  __esModule: true,
  default: MockOpenAI,
  OpenAI: MockOpenAI,
}));

export default MockOpenAI;
