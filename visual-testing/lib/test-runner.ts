import { PuppeteerClient } from './puppeteer-client';
import { VisualEvaluator } from './visual-evaluator';
import fs from 'fs/promises';
import path from 'path';

export interface VisualGoal {
  name: string;
  description: string;
  checks: string[];
  targetUrl?: string;
  setupActions?: Array<{
    type: 'click' | 'type' | 'wait' | 'navigate';
    selector?: string;
    value?: string;
    timeout?: number;
  }>;
}

export interface TestResult {
  goalName: string;
  iteration: number;
  screenshotPath: string;
  reportPath: string;
  timestamp: Date;
  passed?: boolean;
}

export class TestRunner {
  private client: PuppeteerClient;
  private evaluator: VisualEvaluator;
  private resultsDir: string;

  constructor(
    client: PuppeteerClient,
    evaluator: VisualEvaluator,
    resultsDir: string = './visual-testing/results'
  ) {
    this.client = client;
    this.evaluator = evaluator;
    this.resultsDir = resultsDir;
  }

  /**
   * Run a single visual test iteration
   */
  async runIteration(goal: VisualGoal, iteration: number): Promise<TestResult> {
    const timestamp = new Date();
    const testName = `${goal.name}-iter-${iteration}`;
    
    // Navigate to target URL if specified
    if (goal.targetUrl) {
      await this.client.navigate(goal.targetUrl);
    }
    
    // Execute setup actions
    if (goal.setupActions) {
      for (const action of goal.setupActions) {
        await this.executeAction(action);
      }
    }
    
    // Take screenshot
    const screenshotPath = await this.client.screenshot(testName);
    
    // Generate report for Claude
    const report = await this.evaluator.generateVisualReport(
      screenshotPath,
      goal.checks
    );
    
    // Save report
    const reportPath = path.join(
      this.resultsDir,
      `${testName}-report.md`
    );
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    return {
      goalName: goal.name,
      iteration,
      screenshotPath,
      reportPath,
      timestamp
    };
  }

  /**
   * Execute a setup action
   */
  private async executeAction(action: any): Promise<void> {
    switch (action.type) {
      case 'click':
        await this.client.click(action.selector);
        break;
      case 'type':
        await this.client.type(action.selector, action.value);
        break;
      case 'wait':
        await this.client.waitForSelector(action.selector, action.timeout);
        break;
      case 'navigate':
        await this.client.navigate(action.value);
        break;
    }
  }

  /**
   * Run iterative visual development
   * This method is designed to be called by Claude in a loop
   */
  async iterateUntilGoal(
    goal: VisualGoal,
    maxIterations: number = 10,
    onIteration?: (result: TestResult) => Promise<boolean>
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    try {
      await this.client.launch();
      
      for (let i = 1; i <= maxIterations; i++) {
        console.log(`Running iteration ${i} for goal: ${goal.name}`);
        
        const result = await this.runIteration(goal, i);
        results.push(result);
        
        // Call the iteration callback if provided
        // This is where Claude would analyze the screenshot and decide if the goal is met
        if (onIteration) {
          const goalMet = await onIteration(result);
          if (goalMet) {
            console.log(`Goal "${goal.name}" achieved in ${i} iterations!`);
            break;
          }
        }
        
        // Wait a bit between iterations to allow for code changes
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } finally {
      await this.client.close();
    }
    
    return results;
  }

  /**
   * Compare current screenshot with baseline
   */
  async compareWithBaseline(
    screenshotPath: string,
    baselineName: string,
    threshold: number = 0.1
  ): Promise<boolean> {
    if (!await this.evaluator.hasBaseline(baselineName)) {
      console.log(`No baseline found for ${baselineName}, creating one...`);
      await this.evaluator.updateBaseline(screenshotPath, baselineName);
      return true;
    }
    
    const baselinePath = path.join(
      './visual-testing/screenshots/baseline',
      `${baselineName}.png`
    );
    
    const comparison = await this.evaluator.compareImages(
      screenshotPath,
      baselinePath,
      threshold
    );
    
    return comparison.match;
  }

  /**
   * Generate a summary report of all iterations
   */
  async generateSummaryReport(results: TestResult[]): Promise<string> {
    const reportPath = path.join(
      this.resultsDir,
      `summary-${Date.now()}.md`
    );
    
    let content = `# Visual Test Summary\n\n`;
    content += `**Total Iterations:** ${results.length}\n\n`;
    
    for (const result of results) {
      content += `## Iteration ${result.iteration}\n`;
      content += `- **Timestamp:** ${result.timestamp.toISOString()}\n`;
      content += `- **Screenshot:** ${result.screenshotPath}\n`;
      content += `- **Report:** ${result.reportPath}\n`;
      content += `- **Passed:** ${result.passed ?? 'Not evaluated'}\n\n`;
    }
    
    await fs.writeFile(reportPath, content);
    return reportPath;
  }
}