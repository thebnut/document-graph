/**
 * Tests for Google Auth Service
 */

import { googleAuthService, TokenResponse, AuthState, StoredTokens } from '../googleAuthService';
import { mockLocalStorage, delay, createDeferredPromise } from '../../test-utils';

describe('GoogleAuthService', () => {
  let mockTokenClient: any;
  let mockGoogle: any;
  let localStorage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    // Reset the singleton instance
    (googleAuthService as any).tokenClient = null;
    (googleAuthService as any).currentToken = null;
    (googleAuthService as any).tokenExpiresAt = null;
    (googleAuthService as any).authListeners = [];
    (googleAuthService as any).userEmail = null;

    // Mock localStorage
    localStorage = mockLocalStorage();

    // Mock token client
    mockTokenClient = {
      requestAccessToken: jest.fn(),
    };

    // Mock Google Identity Services
    mockGoogle = {
      accounts: {
        oauth2: {
          initTokenClient: jest.fn(() => mockTokenClient),
          hasGrantedAllScopes: jest.fn(() => true),
          hasGrantedAnyScope: jest.fn(() => true),
          revoke: jest.fn((token: string, callback?: () => void) => {
            if (callback) callback();
          }),
        },
      },
    };

    // Set up window.google
    (window as any).google = mockGoogle;

    // Mock fetch for user info
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ email: 'test@example.com' }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('initialize', () => {
    it('should initialize the token client successfully', async () => {
      await googleAuthService.initialize();

      expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: expect.any(String),
          scope: expect.any(String),
          callback: expect.any(Function),
          error_callback: expect.any(Function),
        })
      );
    });

    it('should load stored tokens on initialization', async () => {
      const storedTokens: StoredTokens = {
        accessToken: 'stored-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scope: 'https://www.googleapis.com/auth/drive.file',
        userEmail: 'stored@example.com',
      };

      localStorage.setItem('lifemap-google-tokens', JSON.stringify(storedTokens));

      await googleAuthService.initialize();

      expect(googleAuthService.isAuthenticated()).toBe(true);
      expect(googleAuthService.getAccessToken()).toBe('stored-token');
    });

    it('should not load expired stored tokens', async () => {
      const expiredTokens: StoredTokens = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        scope: 'https://www.googleapis.com/auth/drive.file',
      };

      localStorage.setItem('lifemap-google-tokens', JSON.stringify(expiredTokens));

      await googleAuthService.initialize();

      expect(googleAuthService.isAuthenticated()).toBe(false);
      expect(googleAuthService.getAccessToken()).toBeNull();
    });

    it('should wait for Google Identity Services to load', async () => {
      // Remove window.google initially
      delete (window as any).google;

      const initPromise = googleAuthService.initialize();

      // Simulate script loading after 100ms
      await delay(100);
      (window as any).google = mockGoogle;

      await initPromise;

      expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalled();
    });

    it('should timeout if Google Identity Services fails to load', async () => {
      delete (window as any).google;

      await expect(googleAuthService.initialize()).rejects.toThrow(
        'Google Identity Services failed to load'
      );
    }, 10000); // 10 second timeout for this test
  });

  describe('signIn', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should successfully sign in with valid token response', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      // Mock requestAccessToken to immediately call the callback
      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      expect(mockTokenClient.requestAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'select_account',
        })
      );

      expect(googleAuthService.isAuthenticated()).toBe(true);
      expect(googleAuthService.getAccessToken()).toBe('new-access-token');
    });

    it('should fetch user info after successful sign in', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      // Wait for user info fetch
      await delay(100);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: 'Bearer new-access-token',
          },
        }
      );

      const authState = googleAuthService.getAuthState();
      expect(authState.userEmail).toBe('test@example.com');
    });

    it('should save tokens to localStorage after sign in', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      const stored = localStorage.getItem('lifemap-google-tokens');
      expect(stored).toBeTruthy();

      const tokens = JSON.parse(stored!);
      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should reject on sign in error', async () => {
      const errorResponse: TokenResponse = {
        access_token: '',
        expires_in: 0,
        scope: '',
        token_type: '',
        error: 'access_denied',
        error_description: 'User denied access',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(errorResponse);
      });

      await expect(googleAuthService.signIn()).rejects.toThrow('User denied access');

      expect(googleAuthService.isAuthenticated()).toBe(false);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = (googleAuthService as any);
      uninitializedService.tokenClient = null;

      await expect(googleAuthService.signIn()).rejects.toThrow(
        'Google Auth not initialized'
      );
    });
  });

  describe('signOut', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();

      // Sign in first
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();
    });

    it('should successfully sign out and revoke token', async () => {
      expect(googleAuthService.isAuthenticated()).toBe(true);

      await googleAuthService.signOut();

      expect(mockGoogle.accounts.oauth2.revoke).toHaveBeenCalledWith(
        'test-token',
        expect.any(Function)
      );

      expect(googleAuthService.isAuthenticated()).toBe(false);
      expect(googleAuthService.getAccessToken()).toBeNull();
    });

    it('should clear stored tokens on sign out', async () => {
      await googleAuthService.signOut();

      const stored = localStorage.getItem('lifemap-google-tokens');
      expect(stored).toBeNull();
    });

    it('should clear user email on sign out', async () => {
      await googleAuthService.signOut();

      const authState = googleAuthService.getAuthState();
      expect(authState.userEmail).toBeNull();
    });

    it('should handle sign out when no token exists', async () => {
      (googleAuthService as any).currentToken = null;

      await googleAuthService.signOut();

      expect(mockGoogle.accounts.oauth2.revoke).not.toHaveBeenCalled();
      expect(googleAuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should return true when token is valid', () => {
      (googleAuthService as any).currentToken = 'valid-token';
      (googleAuthService as any).tokenExpiresAt = Date.now() + 3600000;

      expect(googleAuthService.isAuthenticated()).toBe(true);
    });

    it('should return false when token is expired', () => {
      (googleAuthService as any).currentToken = 'expired-token';
      (googleAuthService as any).tokenExpiresAt = Date.now() - 1000;

      expect(googleAuthService.isAuthenticated()).toBe(false);
    });

    it('should return false when no token exists', () => {
      (googleAuthService as any).currentToken = null;
      (googleAuthService as any).tokenExpiresAt = null;

      expect(googleAuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should return token when authenticated', () => {
      (googleAuthService as any).currentToken = 'valid-token';
      (googleAuthService as any).tokenExpiresAt = Date.now() + 3600000;

      expect(googleAuthService.getAccessToken()).toBe('valid-token');
    });

    it('should return null when not authenticated', () => {
      (googleAuthService as any).currentToken = null;

      expect(googleAuthService.getAccessToken()).toBeNull();
    });

    it('should return null when token is expired', () => {
      (googleAuthService as any).currentToken = 'expired-token';
      (googleAuthService as any).tokenExpiresAt = Date.now() - 1000;

      expect(googleAuthService.getAccessToken()).toBeNull();
    });
  });

  describe('getAuthState', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should return correct auth state when authenticated', () => {
      (googleAuthService as any).currentToken = 'valid-token';
      (googleAuthService as any).tokenExpiresAt = Date.now() + 3600000;
      (googleAuthService as any).userEmail = 'test@example.com';

      const state = googleAuthService.getAuthState();

      expect(state).toEqual({
        isAuthenticated: true,
        accessToken: 'valid-token',
        error: null,
        userEmail: 'test@example.com',
      });
    });

    it('should return correct auth state when not authenticated', () => {
      const state = googleAuthService.getAuthState();

      expect(state).toEqual({
        isAuthenticated: false,
        accessToken: null,
        error: null,
        userEmail: null,
      });
    });
  });

  describe('onAuthStateChange', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should notify listeners on auth state change', async () => {
      const listener = jest.fn();
      googleAuthService.onAuthStateChange(listener);

      // Trigger sign in
      const mockTokenResponse: TokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: true,
          accessToken: 'test-token',
        })
      );
    });

    it('should support multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      googleAuthService.onAuthStateChange(listener1);
      googleAuthService.onAuthStateChange(listener2);

      const mockTokenResponse: TokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should allow unsubscribing', async () => {
      const listener = jest.fn();
      const unsubscribe = googleAuthService.onAuthStateChange(listener);

      // Unsubscribe immediately
      unsubscribe();

      const mockTokenResponse: TokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      googleAuthService.onAuthStateChange(errorListener);
      googleAuthService.onAuthStateChange(normalListener);

      const mockTokenResponse: TokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      // Both listeners should be called despite error
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('needsTokenRefresh', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should return true when no token exists', () => {
      expect(googleAuthService.needsTokenRefresh()).toBe(true);
    });

    it('should return true when token expires in less than 5 minutes', () => {
      (googleAuthService as any).tokenExpiresAt = Date.now() + 4 * 60 * 1000; // 4 minutes

      expect(googleAuthService.needsTokenRefresh()).toBe(true);
    });

    it('should return false when token is still valid for more than 5 minutes', () => {
      (googleAuthService as any).tokenExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      expect(googleAuthService.needsTokenRefresh()).toBe(false);
    });
  });

  describe('refreshToken', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should successfully refresh the token', async () => {
      const newTokenResponse: TokenResponse = {
        access_token: 'refreshed-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(newTokenResponse);
      });

      await googleAuthService.refreshToken();

      expect(mockTokenClient.requestAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: '', // No account chooser for refresh
        })
      );

      expect(googleAuthService.getAccessToken()).toBe('refreshed-token');
    });

    it('should reject on refresh error', async () => {
      const errorResponse: TokenResponse = {
        access_token: '',
        expires_in: 0,
        scope: '',
        token_type: '',
        error: 'invalid_grant',
        error_description: 'Token has been revoked',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(errorResponse);
      });

      await expect(googleAuthService.refreshToken()).rejects.toThrow(
        'Token has been revoked'
      );
    });

    it('should throw error if not initialized', async () => {
      (googleAuthService as any).tokenClient = null;

      await expect(googleAuthService.refreshToken()).rejects.toThrow(
        'Google Auth not initialized'
      );
    });
  });

  describe('localStorage integration', () => {
    beforeEach(async () => {
      await googleAuthService.initialize();
    });

    it('should persist tokens across service instances', async () => {
      const mockTokenResponse: TokenResponse = {
        access_token: 'persistent-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };

      mockTokenClient.requestAccessToken.mockImplementation((config: any) => {
        config.callback(mockTokenResponse);
      });

      await googleAuthService.signIn();

      // Wait for user info
      await delay(100);

      // Check localStorage has the token
      const stored = localStorage.getItem('lifemap-google-tokens');
      expect(stored).toBeTruthy();

      const tokens = JSON.parse(stored!);
      expect(tokens.accessToken).toBe('persistent-token');
      expect(tokens.userEmail).toBe('test@example.com');
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      localStorage.setItem('lifemap-google-tokens', 'invalid-json{');

      await googleAuthService.initialize();

      // Should not throw, should just not load tokens
      expect(googleAuthService.isAuthenticated()).toBe(false);
    });
  });
});
