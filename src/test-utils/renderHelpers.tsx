/**
 * Render Helpers
 *
 * Custom render functions for React Testing Library with providers.
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import { DocumentViewerProvider } from '../contexts/DocumentViewerContext';

/**
 * Custom render function that wraps components with common providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider>
        <DocumentViewerProvider>
          {children}
        </DocumentViewerProvider>
      </AuthProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Custom render function for auth-protected components
 */
export function renderWithAuth(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Custom render function for document viewer components
 */
export function renderWithDocumentViewer(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <DocumentViewerProvider>{children}</DocumentViewerProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export specific items from React Testing Library (avoid conflicts)
export { screen, fireEvent, waitFor, act } from '@testing-library/react';
