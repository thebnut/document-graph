module.exports = {
  // Use the default Jest preset from Create React App
  preset: 'react-scripts',

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/test-utils/**',
  ],

  coverageThresholds: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
    './src/services/': {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['react-app'] }],
  },

  // Transform ES modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(d3-hierarchy)/)',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test environment
  testEnvironment: 'jsdom',

  // Global test timeout
  testTimeout: 10000,

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Reset mocks between every test
  resetMocks: true,

  // Restore mocks between every test
  restoreMocks: true,
};
