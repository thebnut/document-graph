/**
 * Google Drive Authentication Component
 * Handles the OAuth2 flow and displays authentication status
 */

import React, { useState, useEffect } from 'react';
import { googleAuthService, AuthState } from '../services/googleAuthService';
import { googleDriveService } from '../services/googleDriveService';

interface GoogleDriveAuthProps {
  onAuthComplete?: () => void;
  required?: boolean;
}

export const GoogleDriveAuth: React.FC<GoogleDriveAuthProps> = ({ 
  onAuthComplete, 
  required = false 
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    error: null
  });
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  
  useEffect(() => {
    // Initialize and check auth status
    const initAuth = async () => {
      try {
        setInitializing(true);
        await googleAuthService.initialize();
        const state = googleAuthService.getAuthState();
        setAuthState(state);
        
        if (state.isAuthenticated && onAuthComplete) {
          onAuthComplete();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize authentication';
        setAuthState(prev => ({ ...prev, error: errorMessage }));
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };
    
    initAuth();
    
    // Subscribe to auth state changes
    const unsubscribe = googleAuthService.onAuthStateChange((state) => {
      setAuthState(state);
      if (state.isAuthenticated && onAuthComplete) {
        onAuthComplete();
      }
    });
    
    return unsubscribe;
  }, [onAuthComplete]);
  
  const handleSignIn = async () => {
    setLoading(true);
    setAuthState(prev => ({ ...prev, error: null }));
    
    try {
      await googleAuthService.signIn();
      
      // Ensure folder structure after sign in
      console.log('Creating folder structure...');
      await googleDriveService.ensureFolderStructure();
      console.log('Folder structure created successfully');
    } catch (error) {
      console.error('Sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setAuthState(prev => ({ 
        ...prev, 
        error: errorMessage 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    setLoading(true);
    
    try {
      await googleAuthService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setAuthState(prev => ({ 
        ...prev, 
        error: errorMessage 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  if (initializing) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-600">Initializing Google Drive...</div>
      </div>
    );
  }
  
  if (!required && authState.isAuthenticated) {
    // If auth is not required and user is authenticated, show minimal UI
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-green-600">●</span>
        <span>Connected to Google Drive</span>
        {authState.user && (
          <span className="text-gray-500">
            ({authState.user.getBasicProfile().getEmail()})
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-blue-600 hover:text-blue-800 underline"
          disabled={loading}
        >
          Disconnect
        </button>
      </div>
    );
  }
  
  if (required && !authState.isAuthenticated) {
    // If auth is required and user is not authenticated, show modal
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Connect to Google Drive</h2>
          <p className="text-gray-600 mb-6">
            LifeMap needs access to your Google Drive to store and sync your documents securely.
          </p>
          
          {authState.error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {authState.error}
            </div>
          )}
          
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect Google Drive
              </>
            )}
          </button>
          
          <div className="mt-4 text-xs text-gray-500 text-center">
            By connecting, you grant LifeMap permission to create folders and manage documents in your Google Drive.
          </div>
        </div>
      </div>
    );
  }
  
  // Default state - not required, not authenticated
  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold mb-2">Google Drive Storage</h3>
      <p className="text-sm text-gray-600 mb-3">
        Connect your Google Drive to save and sync your documents across devices.
      </p>
      
      {authState.error && (
        <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {authState.error}
        </div>
      )}
      
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </>
        ) : (
          'Connect Google Drive'
        )}
      </button>
    </div>
  );
};