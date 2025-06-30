import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface VisualCheckResult {
  passed: boolean;
  description: string;
  details?: any;
}

export interface ComparisonResult {
  match: boolean;
  diffPixels: number;
  diffPercentage: number;
  diffImagePath?: string;
}

export class VisualEvaluator {
  private screenshotDir: string;

  constructor(screenshotDir: string = './visual-testing/screenshots') {
    this.screenshotDir = screenshotDir;
  }

  /**
   * Compare two images and return similarity metrics
   */
  async compareImages(
    actualPath: string, 
    expectedPath: string,
    threshold: number = 0.1
  ): Promise<ComparisonResult> {
    try {
      const [actualBuffer, expectedBuffer] = await Promise.all([
        fs.readFile(actualPath),
        fs.readFile(expectedPath)
      ]);

      const actual = PNG.sync.read(actualBuffer);
      const expected = PNG.sync.read(expectedBuffer);

      if (actual.width !== expected.width || actual.height !== expected.height) {
        return {
          match: false,
          diffPixels: -1,
          diffPercentage: 100,
          details: 'Images have different dimensions'
        };
      }

      const diff = new PNG({ width: actual.width, height: actual.height });
      const diffPixels = pixelmatch(
        actual.data,
        expected.data,
        diff.data,
        actual.width,
        actual.height,
        { threshold }
      );

      const totalPixels = actual.width * actual.height;
      const diffPercentage = (diffPixels / totalPixels) * 100;

      // Save diff image if there are differences
      if (diffPixels > 0) {
        const diffPath = path.join(
          this.screenshotDir,
          'current',
          `diff-${Date.now()}.png`
        );
        await fs.writeFile(diffPath, PNG.sync.write(diff));
        
        return {
          match: false,
          diffPixels,
          diffPercentage,
          diffImagePath: diffPath
        };
      }

      return {
        match: true,
        diffPixels: 0,
        diffPercentage: 0
      };
    } catch (error) {
      console.error('Error comparing images:', error);
      return {
        match: false,
        diffPixels: -1,
        diffPercentage: 100
      };
    }
  }

  /**
   * Generate a markdown report for Claude to analyze
   */
  async generateVisualReport(
    screenshotPath: string,
    checks: string[]
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    let report = `# Visual Test Report\n\n`;
    report += `**Generated at:** ${timestamp}\n`;
    report += `**Screenshot:** ${screenshotPath}\n\n`;
    report += `## Visual Checks\n\n`;
    
    for (const check of checks) {
      report += `- [ ] ${check}\n`;
    }
    
    report += `\n## Analysis Request\n\n`;
    report += `Please analyze the screenshot at "${screenshotPath}" and evaluate whether each visual check passes.\n`;
    report += `For each check, provide specific feedback on what needs to be changed if it doesn't pass.\n`;
    report += `Also note any other visual issues you observe.\n`;
    
    return report;
  }

  /**
   * Extract visual properties from a screenshot for analysis
   */
  async analyzeScreenshot(screenshotPath: string): Promise<{
    path: string;
    dimensions: { width: number; height: number };
    fileSize: number;
    created: Date;
  }> {
    const stats = await fs.stat(screenshotPath);
    const buffer = await fs.readFile(screenshotPath);
    const png = PNG.sync.read(buffer);
    
    return {
      path: screenshotPath,
      dimensions: {
        width: png.width,
        height: png.height
      },
      fileSize: stats.size,
      created: stats.birthtime
    };
  }

  /**
   * Check if a baseline image exists
   */
  async hasBaseline(name: string): Promise<boolean> {
    const baselinePath = path.join(this.screenshotDir, 'baseline', `${name}.png`);
    try {
      await fs.access(baselinePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update baseline image
   */
  async updateBaseline(currentPath: string, name: string): Promise<void> {
    const baselinePath = path.join(this.screenshotDir, 'baseline', `${name}.png`);
    await fs.mkdir(path.dirname(baselinePath), { recursive: true });
    await fs.copyFile(currentPath, baselinePath);
  }

  /**
   * Clean up old screenshots
   */
  async cleanupOldScreenshots(daysToKeep: number = 7): Promise<void> {
    const currentDir = path.join(this.screenshotDir, 'current');
    const files = await fs.readdir(currentDir);
    const now = Date.now();
    const cutoff = daysToKeep * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filepath = path.join(currentDir, file);
      const stats = await fs.stat(filepath);
      
      if (now - stats.mtimeMs > cutoff) {
        await fs.unlink(filepath);
      }
    }
  }
}