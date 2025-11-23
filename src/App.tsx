/**
 * Main App Component
 *
 * Provides authentication, document viewer context, and ReactFlow provider
 */

import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

// Initialize ResizeObserver error suppression
import { initializeResizeObserverFix } from './utils/resizeObserverFix';

// Context providers
import { DocumentViewerProvider } from './contexts/DocumentViewerContext';
import { AuthProvider } from './contexts/AuthContext';

// Components
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DocumentGraphInner } from './components/DocumentGraphInner';

// Wrapper component with providers
function DocumentGraphApp() {
  // Initialize ResizeObserver fix on mount
  React.useEffect(() => {
    initializeResizeObserverFix();

    // Debug utilities disabled for production builds
    // These files access localStorage at module load time, which breaks webpack builds
    // Uncomment individually in development if needed:
    // if (process.env.NODE_ENV === 'development') {
    //   import('./utils/googleServiceTest');
    //   import('./utils/googleAuthDebug');
    //   import('./utils/googleDriveCleanup');
    //   import('./utils/testAIServices');
    //   import('./utils/removePassportNodes');
    // }
  }, []);

  return (
    <DocumentViewerProvider>
      <ReactFlowProvider>
        <DocumentGraphInner />
      </ReactFlowProvider>
    </DocumentViewerProvider>
  );
}

// Main App component with authentication
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate requireAuth={true}>
          <DocumentGraphApp />
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  );
}
