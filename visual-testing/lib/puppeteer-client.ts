import puppeteer, { Browser, Page, LaunchOptions } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { TestConfig, defaultConfig } from '../config/test-config';

export interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class PuppeteerClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: TestConfig;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async launch(): Promise<void> {
    const options: LaunchOptions = {
      headless: this.config.headless,
      defaultViewport: this.config.defaultViewport,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    this.browser = await puppeteer.launch(options);
    this.page = await this.browser.newPage();
    
    // Set default timeout
    this.page.setDefaultTimeout(this.config.defaultTimeout);
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: this.config.defaultTimeout 
    });
  }

  async screenshot(name: string, options: ScreenshotOptions = {}): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.config.screenshotPath, 'current', filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    await this.page.screenshot({
      path: filepath as `${string}.png`,
      fullPage: options.fullPage ?? true,
      clip: options.clip
    });
    
    return filepath;
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    
    await this.page.waitForSelector(selector, { 
      timeout: timeout ?? this.config.defaultTimeout 
    });
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    
    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    
    await this.page.type(selector, text);
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.page) throw new Error('Browser not launched');
    
    return await this.page.evaluate(fn);
  }

  async getElementBounds(selector: string): Promise<{x: number, y: number, width: number, height: number} | null> {
    if (!this.page) throw new Error('Browser not launched');
    
    return await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;
      
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    }, selector);
  }

  async setViewport(width: number, height: number): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    
    await this.page.setViewport({ width, height });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  getPage(): Page | null {
    return this.page;
  }
}