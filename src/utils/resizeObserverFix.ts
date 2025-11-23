/**
 * ResizeObserver Error Suppression
 *
 * Suppresses the common "ResizeObserver loop completed with undelivered notifications" error
 * that occurs in React apps using ReactFlow and other libraries.
 *
 * This is a known benign error that doesn't affect functionality.
 */

/**
 * Check if an error is a ResizeObserver error
 */
export const suppressResizeObserverError = (e: any): boolean => {
  const message = e.message || e.reason?.message || '';
  return message.includes('ResizeObserver loop completed with undelivered notifications');
};

/**
 * Initialize global error handlers for ResizeObserver errors
 */
export function initializeResizeObserverFix() {
  // Global error handlers
  window.addEventListener('error', (e) => {
    if (suppressResizeObserverError(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    if (suppressResizeObserverError(e)) {
      e.preventDefault();
      return false;
    }
  });

  // Override ResizeObserver with debounced callback
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      let debounceTimer: number;
      const debouncedCallback: ResizeObserverCallback = (entries, observer) => {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          try {
            requestAnimationFrame(() => {
              try {
                callback(entries, observer);
              } catch (err: any) {
                if (!suppressResizeObserverError(err)) {
                  throw err;
                }
              }
            });
          } catch (err: any) {
            if (!suppressResizeObserverError(err)) {
              throw err;
            }
          }
        }, 0);
      };
      super(debouncedCallback);
    }
  };

  // Override console.error to suppress ResizeObserver errors in console
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (args[0] && suppressResizeObserverError({ message: String(args[0]) })) {
      return;
    }
    originalError.apply(console, args);
  };
}
