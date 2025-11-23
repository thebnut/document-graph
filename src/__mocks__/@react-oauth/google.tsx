/**
 * Mock @react-oauth/google
 *
 * Mocks Google OAuth components for testing.
 */

import React from 'react';

export const mockGoogleOAuthProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="google-oauth-provider">{children}</div>
);

export const mockUseGoogleLogin = jest.fn(() => ({
  login: jest.fn(),
}));

export const mockUseGoogleOneTapLogin = jest.fn();

export const mockGoogleLogin = ({ onSuccess, onError }: any) => (
  <button
    data-testid="google-login-button"
    onClick={() => {
      const mockCredential = {
        credential: 'mock-credential-token',
        clientId: 'mock-client-id',
      };
      onSuccess?.(mockCredential);
    }}
  >
    Sign in with Google
  </button>
);

// Export the mocks
export const GoogleOAuthProvider = mockGoogleOAuthProvider;
export const useGoogleLogin = mockUseGoogleLogin;
export const useGoogleOneTapLogin = mockUseGoogleOneTapLogin;
export const GoogleLogin = mockGoogleLogin;
