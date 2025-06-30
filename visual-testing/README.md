# Visual Testing System

This directory contains a Puppeteer-based visual testing framework designed for iterative development with Claude Code.

## Overview

The visual testing system allows Claude to:
1. Take screenshots of the application
2. Analyze visual elements against defined goals
3. Make code changes based on visual feedback
4. Iterate until visual goals are achieved

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start your development server:
```bash
npm start
```

3. Run visual tests:
```bash
npm run visual:test goals/center-nodes.json
```

## Directory Structure

```
visual-testing/
├── lib/                    # Core libraries
│   ├── puppeteer-client.ts # Browser automation
│   ├── visual-evaluator.ts # Image comparison and analysis
│   └── test-runner.ts      # Test orchestration
├── tests/                  # Test files
├── screenshots/           
│   ├── baseline/          # Reference images
│   └── current/           # Test run screenshots
├── goals/                 # Visual goal configurations
└── results/               # Test reports
```

## Usage Examples

### Take a Screenshot
```typescript
import { takeScreenshot } from './visual-testing';

const screenshotPath = await takeScreenshot('http://localhost:3000');
// Claude can then read this screenshot using the Read tool
```

### Run Visual Test with Goals
```typescript
import { runVisualTest } from './visual-testing';

const goal = {
  name: 'centered-layout',
  description: 'Center all nodes in viewport',
  targetUrl: 'http://localhost:3000',
  checks: [
    'Nodes should be centered',
    'No overlapping elements',
    'Proper spacing between nodes'
  ]
};

await runVisualTest(goal);
```

### Quick Visual Check
```typescript
import { quickVisualCheck } from './visual-testing';

await quickVisualCheck([
  'Logo is visible',
  'Navigation menu is present',
  'Dark mode toggle works'
]);
```

## How It Works

1. **Define Visual Goal**: Specify what the UI should look like
2. **Run Test**: Puppeteer navigates to the page and takes screenshots
3. **Generate Report**: Creates a markdown report with the screenshot path
4. **Claude Analysis**: Claude reads the screenshot and evaluates against checks
5. **Make Changes**: Based on analysis, code changes are made
6. **Iterate**: Process repeats until goals are met

## Integration with Claude Code

Claude can use this system by:
1. Reading screenshots with the `Read` tool
2. Analyzing visual elements in the screenshots
3. Making code changes based on visual feedback
4. Running tests again to verify improvements

## Example Workflow

```bash
# 1. Start dev server
npm start

# 2. Run visual test
npm run visual:screenshot

# 3. Claude reads the screenshot
# 4. Claude makes code changes
# 5. Repeat until satisfied
```

## Tips

- Keep visual goals specific and measurable
- Use meaningful names for screenshots
- Clean up old screenshots periodically with `npm run visual:clean`
- Update baselines when intentional changes are made