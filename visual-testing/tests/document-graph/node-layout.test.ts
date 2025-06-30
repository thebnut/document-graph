import { PuppeteerClient } from '../../lib/puppeteer-client';
import { VisualEvaluator } from '../../lib/visual-evaluator';
import { TestRunner, VisualGoal } from '../../lib/test-runner';

/**
 * Example visual test for document graph node layout
 */
export async function testNodeLayout() {
  const client = new PuppeteerClient({
    headless: false, // Set to true for CI
    baseUrl: 'http://localhost:3000'
  });
  
  const evaluator = new VisualEvaluator();
  const runner = new TestRunner(client, evaluator);
  
  const goal: VisualGoal = {
    name: 'centered-circular-layout',
    description: 'Ensure document graph nodes are arranged in a centered circular pattern',
    targetUrl: 'http://localhost:3000',
    checks: [
      'Primary person nodes (Brett and Gemma) should be centered in the viewport',
      'Child nodes should form a circular pattern around parent nodes',
      'Node spacing should be even with no overlaps',
      'All nodes should be visible within the viewport',
      'Node colors should match the type (blue for person, green for asset, purple for document)',
      'Node labels should be clearly readable'
    ],
    setupActions: [
      {
        type: 'wait',
        selector: '.react-flow__node',
        timeout: 5000
      }
    ]
  };
  
  const results = await runner.iterateUntilGoal(
    goal,
    5, // max iterations
    async (result) => {
      console.log(`\nIteration ${result.iteration} complete!`);
      console.log(`Screenshot saved to: ${result.screenshotPath}`);
      console.log(`Report saved to: ${result.reportPath}`);
      
      // In a real scenario, Claude would analyze the screenshot here
      // and return true if the goal is met, false otherwise
      
      // For now, we'll just return false to continue iterations
      return false;
    }
  );
  
  const summaryPath = await runner.generateSummaryReport(results);
  console.log(`\nTest complete! Summary saved to: ${summaryPath}`);
}

/**
 * Test for proper document viewer functionality
 */
export async function testDocumentViewer() {
  const client = new PuppeteerClient({
    headless: false
  });
  
  const evaluator = new VisualEvaluator();
  const runner = new TestRunner(client, evaluator);
  
  const goal: VisualGoal = {
    name: 'document-viewer-display',
    description: 'Ensure document viewer properly displays PDFs and images',
    targetUrl: 'http://localhost:3000',
    checks: [
      'Document viewer panel should slide in from the right',
      'PDF should be displayed in the viewer',
      'Download button should be visible in the toolbar',
      'Close button should be in the top right',
      'Dark mode should work properly'
    ],
    setupActions: [
      {
        type: 'wait',
        selector: '.react-flow__node',
        timeout: 5000
      },
      {
        type: 'click',
        selector: '[data-id="brett-passport"]' // Assuming we add data-id attributes
      },
      {
        type: 'wait',
        selector: '.document-viewer', // Assuming we add this class
        timeout: 3000
      }
    ]
  };
  
  return runner.iterateUntilGoal(goal, 3);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNodeLayout().catch(console.error);
}