import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

// More aggressive ResizeObserver error suppression
if (typeof window !== 'undefined') {
  const errorHandler = (e: ErrorEvent) => {
    if (e.message.includes('ResizeObserver loop completed with undelivered notifications') ||
        e.message.includes('ResizeObserver loop limit exceeded')) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  };
  
  // Override console methods
  const resizeObserverErr = window.console.error;
  const resizeObserverWarn = window.console.warn;
  
  window.console.error = (...args: any[]) => {
    const firstArg = args[0]?.toString() || '';
    if (firstArg.includes('ResizeObserver loop completed') || 
        firstArg.includes('ResizeObserver loop limit exceeded')) {
      return;
    }
    resizeObserverErr(...args);
  };
  
  window.console.warn = (...args: any[]) => {
    const firstArg = args[0]?.toString() || '';
    if (firstArg.includes('ResizeObserver loop completed') || 
        firstArg.includes('ResizeObserver loop limit exceeded')) {
      return;
    }
    resizeObserverWarn(...args);
  };
  
  // Add global error handler
  window.addEventListener('error', errorHandler);
  
  // Also suppress unhandledrejection for these errors
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('ResizeObserver')) {
      e.preventDefault();
      return false;
    }
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Remove StrictMode as it can cause double rendering which exacerbates the issue
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);