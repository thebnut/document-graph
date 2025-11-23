/**
 * Tests for ErrorBoundary component
 *
 * Tests error catching, ResizeObserver error suppression, and error UI
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import * as resizeObserverFix from '../../utils/resizeObserverFix';

// Mock the resizeObserverFix utility
jest.mock('../../utils/resizeObserverFix', () => ({
  suppressResizeObserverError: jest.fn(),
}));

// Component that throws an error
const ThrowError: React.FC<{ error?: Error }> = ({ error }) => {
  throw error || new Error('Test error');
};

// Component that doesn't throw
const NoError: React.FC = () => <div>No error content</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('Normal rendering', () => {
    it('should render children when no error occurs', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <NoError />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error content')).toBeInTheDocument();
    });

    it('should not show error UI when no error occurs', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <NoError />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should catch and display error', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Test error message')} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/The application encountered an error/)).toBeInTheDocument();
    });

    it('should display error details in expandable section', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Detailed error message')} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error details')).toBeInTheDocument();
    });

    it('should show reload button', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Test error')} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should call console.error when error is caught', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Console test error')} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('ResizeObserver error suppression', () => {
    it('should suppress ResizeObserver errors and render children', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(true);

      const resizeError = new Error('ResizeObserver loop limit exceeded');

      render(
        <ErrorBoundary>
          <div>Content that would cause ResizeObserver error</div>
        </ErrorBoundary>
      );

      // Should render children normally
      expect(screen.getByText('Content that would cause ResizeObserver error')).toBeInTheDocument();
    });

    it('should call suppressResizeObserverError on error', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Test')} />
        </ErrorBoundary>
      );

      expect(resizeObserverFix.suppressResizeObserverError).toHaveBeenCalled();
    });

    it('should not show error UI for suppressed ResizeObserver errors', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(true);

      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('Error UI components', () => {
    it('should render error title', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render error message', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/The application encountered an error. Please refresh the page to try again./)
      ).toBeInTheDocument();
    });

    it('should render error details when error exists', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      const error = new Error('Specific error message');

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error details')).toBeInTheDocument();
    });
  });

  describe('Initial state', () => {
    it('should initialize with no error state', () => {
      (resizeObserverFix.suppressResizeObserverError as jest.Mock).mockReturnValue(false);

      const { container } = render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      // Should render children, not error UI
      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(container.querySelector('.bg-red-600')).not.toBeInTheDocument();
    });
  });
});
