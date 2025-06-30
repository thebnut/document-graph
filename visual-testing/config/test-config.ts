export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export interface TestConfig {
  baseUrl: string;
  screenshotPath: string;
  defaultViewport: ViewportConfig;
  defaultTimeout: number;
  headless: boolean;
}

export const defaultConfig: TestConfig = {
  baseUrl: 'http://localhost:3000',
  screenshotPath: './visual-testing/screenshots',
  defaultViewport: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1
  },
  defaultTimeout: 30000,
  headless: true
};

// Common viewport sizes for testing
export const viewports = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};