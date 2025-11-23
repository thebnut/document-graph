/**
 * Mock GAPI (Google API) client library
 *
 * Mocks the global gapi object for testing.
 */

export const mockGapiAuth2 = {
  GoogleAuth: jest.fn().mockImplementation(() => ({
    isSignedIn: {
      get: jest.fn(() => false),
      listen: jest.fn(),
    },
    currentUser: {
      get: jest.fn(() => ({
        getAuthResponse: jest.fn(() => ({
          access_token: 'mock-access-token',
          id_token: 'mock-id-token',
          expires_in: 3600,
        })),
        getBasicProfile: jest.fn(() => ({
          getName: jest.fn(() => 'Test User'),
          getEmail: jest.fn(() => 'test@example.com'),
          getImageUrl: jest.fn(() => 'https://example.com/avatar.jpg'),
        })),
      })),
      listen: jest.fn(),
    },
    signIn: jest.fn(() => Promise.resolve({
      getAuthResponse: jest.fn(() => ({
        access_token: 'mock-access-token',
        id_token: 'mock-id-token',
        expires_in: 3600,
      })),
    })),
    signOut: jest.fn(() => Promise.resolve()),
  })),
};

export const mockGapiClient = {
  init: jest.fn(() => Promise.resolve()),
  load: jest.fn((api: string, callback: () => void) => {
    callback();
    return Promise.resolve();
  }),
  setToken: jest.fn(),
  setApiKey: jest.fn(),
  drive: {
    files: {
      get: jest.fn(() => Promise.resolve({
        result: {
          id: 'mock-file-id',
          name: 'mock-file.pdf',
          mimeType: 'application/pdf',
        },
      })),
      list: jest.fn(() => Promise.resolve({
        result: {
          files: [],
        },
      })),
      create: jest.fn(() => Promise.resolve({
        result: {
          id: 'new-file-id',
          name: 'new-file.pdf',
        },
      })),
      update: jest.fn(() => Promise.resolve({
        result: {
          id: 'updated-file-id',
        },
      })),
      delete: jest.fn(() => Promise.resolve({})),
    },
  },
};

export const mockGapi = {
  load: jest.fn((api: string, callback: () => void) => {
    callback();
  }),
  client: mockGapiClient,
  auth2: mockGapiAuth2,
};

// Mock the global gapi object
(global as any).gapi = mockGapi;

export default mockGapi;
