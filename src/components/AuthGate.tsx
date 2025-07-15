/**
 * AuthGate Component
 * Checks authentication status and shows either the auth screen or the main app
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleDriveAuth } from './GoogleDriveAuth';

interface AuthGateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGate: React.FC<AuthGateProps> = ({ 
  children, 
  requireAuth = false 
}) => {
  const { authState, isInitializing } = useAuth();
  const [authCompleted, setAuthCompleted] = useState(false);

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing LifeMap...</p>
        </div>
      </div>
    );
  }

  // If auth is required and user is not authenticated, show auth screen
  if (requireAuth && !authState.isAuthenticated && !authCompleted) {
    return (
      <GoogleDriveAuth 
        required={true} 
        onAuthComplete={() => {
          setAuthCompleted(true);
          // Small delay to allow auth state to propagate
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }} 
      />
    );
  }

  // Show the main app
  return (
    <>
      {children}
      
      {/* Optional: Show auth status in corner when authenticated */}
      {authState.isAuthenticated && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Connected to Google Drive</span>
          {authState.userEmail && (
            <span className="text-gray-400">({authState.userEmail})</span>
          )}
        </div>
      )}
    </>
  );
};