#!/usr/bin/env node

import { PuppeteerClient } from './lib/puppeteer-client';
import { VisualEvaluator } from './lib/visual-evaluator';
import { TestRunner, VisualGoal } from './lib/test-runner';
import fs from 'fs/promises';
import path from 'path';

/**
 * Main entry point for visual testing
 * This can be called by Claude to run visual tests iteratively
 */
export async function runVisualTest(goalConfig: VisualGoal | string) {
  let goal: VisualGoal;
  
  // If a string is passed, try to load it as a JSON file
  if (typeof goalConfig === 'string') {
    const configPath = path.resolve(goalConfig);
    const configContent = await fs.readFile(configPath, 'utf-8');
    goal = JSON.parse(configContent);
  } else {
    goal = goalConfig;
  }
  
  const client = new PuppeteerClient();
  const evaluator = new VisualEvaluator();
  const runner = new TestRunner(client, evaluator);
  
  console.log(`Starting visual test: ${goal.name}`);
  console.log(`Description: ${goal.description}`);
  console.log(`Checks to perform:`);
  goal.checks.forEach((check, i) => {
    console.log(`  ${i + 1}. ${check}`);
  });
  
  const results = await runner.iterateUntilGoal(
    goal,
    10,
    async (result) => {
      // This is where Claude would analyze the screenshot
      console.log(`\n=== Iteration ${result.iteration} Complete ===`);
      console.log(`Screenshot: ${result.screenshotPath}`);
      console.log(`Report: ${result.reportPath}`);
      console.log(`\nWaiting for analysis and code changes...\n`);
      
      // Return false to continue iterations
      // In practice, Claude would analyze and return true when goal is met
      return false;
    }
  );
  
  const summaryPath = await runner.generateSummaryReport(results);
  console.log(`\nTest complete! Summary: ${summaryPath}`);
  
  return results;
}

/**
 * Quick test function for Claude to use
 */
export async function quickVisualCheck(checks: string[], url: string = 'http://localhost:3000') {
  const goal: VisualGoal = {
    name: 'quick-check',
    description: 'Quick visual verification',
    targetUrl: url,
    checks,
    setupActions: [
      {
        type: 'wait',
        selector: 'body',
        timeout: 2000
      }
    ]
  };
  
  return runVisualTest(goal);
}

/**
 * Take a single screenshot for analysis
 */
export async function takeScreenshot(
  url: string = 'http://localhost:3000',
  name: string = 'manual-screenshot'
): Promise<string> {
  const client = new PuppeteerClient();
  
  try {
    await client.launch();
    await client.navigate(url);
    await client.waitForSelector('body');
    
    // Wait for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const screenshotPath = await client.screenshot(name);
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    return screenshotPath;
  } finally {
    await client.close();
  }
}

// Export all classes for direct use
export { PuppeteerClient, VisualEvaluator, TestRunner };
export type { VisualGoal, TestResult } from './lib/test-runner';

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  visual-test <goal-config.json>  - Run a visual test from config file');
    console.log('  visual-test screenshot [url]    - Take a screenshot');
    process.exit(1);
  }
  
  if (args[0] === 'screenshot') {
    const url = args[1] || 'http://localhost:3000';
    takeScreenshot(url).catch(console.error);
  } else {
    runVisualTest(args[0]).catch(console.error);
  }
}