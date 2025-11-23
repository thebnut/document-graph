/**
 * Test Helpers
 *
 * Utility functions to help with common testing tasks.
 */

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Delay execution for a specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy function that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(): jest.MockedFunction<T> {
  return jest.fn() as unknown as jest.MockedFunction<T>;
}

/**
 * Suppress console errors/warnings during tests
 */
export function suppressConsole(methods: Array<'error' | 'warn' | 'log'> = ['error']) {
  const original: { [key: string]: any } = {};

  beforeAll(() => {
    methods.forEach((method) => {
      original[method] = console[method];
      console[method] = jest.fn();
    });
  });

  afterAll(() => {
    methods.forEach((method) => {
      console[method] = original[method];
    });
  });
}

/**
 * Create a mock promise that can be resolved/rejected manually
 */
export function createDeferredPromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

/**
 * Mock localStorage for testing
 */
export function mockLocalStorage() {
  const store: { [key: string]: string } = {};

  const mockLocalStorage = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });

  return mockLocalStorage;
}

/**
 * Mock sessionStorage for testing
 */
export function mockSessionStorage() {
  const store: { [key: string]: string } = {};

  const mockSessionStorage = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };

  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
  });

  return mockSessionStorage;
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: any, options: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    ...options,
  } as Response;
}

/**
 * Mock the global fetch function
 */
export function mockFetch() {
  const mockFn = jest.fn();
  global.fetch = mockFn;
  return mockFn;
}
