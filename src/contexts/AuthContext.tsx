/**
 * Authentication Context
 * Provides global authentication state and methods to all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { googleAuthService, AuthState } from '../services/googleAuthService';
import { googleDriveService } from '../services/googleDriveService';
import { GoogleDriveDataService } from '../services/googleDriveDataService';

interface AuthContextValue {
  authState: AuthState;
  isInitializing: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    error: null,
    userEmail: null
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        await googleAuthService.initialize();
        
        const state = googleAuthService.getAuthState();
        setAuthState(state);
        
        // If authenticated, ensure folder structure exists
        if (state.isAuthenticated) {
          console.log('User authenticated, ensuring Google Drive folder structure...');
          try {
            await googleDriveService.ensureFolderStructure();
            console.log('Folder structure ready');
          } catch (error) {
            console.error('Failed to ensure folder structure:', error);
            // Don't fail auth if folder creation fails - user can still work offline
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setAuthState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize authentication'
        }));
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const unsubscribe = googleAuthService.onAuthStateChange((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      await googleAuthService.signIn();
      
      // Ensure folder structure after sign in
      const state = googleAuthService.getAuthState();
      if (state.isAuthenticated) {
        await googleDriveService.ensureFolderStructure();
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await googleAuthService.signOut();
      // Reset the data service singleton to clear cached data
      GoogleDriveDataService.resetInstance();
      // Reload the page to ensure a clean state
      window.location.reload();
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      if (googleAuthService.needsTokenRefresh()) {
        await googleAuthService.refreshToken();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, user needs to sign in again
      await googleAuthService.signOut();
      throw error;
    }
  }, []);

  const value: AuthContextValue = {
    authState,
    isInitializing,
    signIn,
    signOut,
    refreshAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};