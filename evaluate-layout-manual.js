/**
 * Layout Quality Evaluation Script - Manual Authentication Version
 * Launches browser in visible mode for user to authenticate
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PRODUCTION_URL = 'https://lifemap-six.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'layout-evaluation');

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to wait for user input
const waitForUserInput = (message) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

async function evaluateLayout() {
  console.log('🚀 Starting layout evaluation with manual authentication...\n');

  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false, // Show browser window
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('📡 Navigating to:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('\n✋ BROWSER IS READY FOR LOGIN');
    console.log('👉 Please authenticate with Google Drive in the browser window');
    console.log('👉 Wait for the graph to load completely');

    // Wait for user to press Enter
    await waitForUserInput('\nPress ENTER when you have logged in and the graph is fully loaded...');

    console.log('\n✅ Continuing with automated evaluation...\n');
    await delay(2000);

    // Check if ReactFlow loaded
    console.log('🔍 Checking for ReactFlow...');
    const reactFlowPresent = await page.evaluate(() => {
      return !!document.querySelector('[class*="react-flow"]');
    });

    if (!reactFlowPresent) {
      console.log('⚠️  ReactFlow not found. Taking screenshot for debugging...');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '00-no-reactflow.png'),
        fullPage: false
      });
      throw new Error('ReactFlow not found on page after login');
    }

    console.log('✓ ReactFlow container found');
    await delay(3000); // Allow layout to settle

    // Capture initial state
    console.log('📸 Capturing initial state...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-initial-state.png'),
      fullPage: false
    });

    // Count nodes and edges
    const graphStats = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[class*="react-flow__node"]');
      const edges = document.querySelectorAll('[class*="react-flow__edge"]');
      return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
      };
    });

    console.log(`\n📊 Graph Statistics:`);
    console.log(`   Nodes visible: ${graphStats.nodeCount}`);
    console.log(`   Edges visible: ${graphStats.edgeCount}`);

    // Check for edge rendering issues
    const edgeAnalysis = await page.evaluate(() => {
      const edges = Array.from(document.querySelectorAll('[class*="react-flow__edge"]'));
      const edgeData = edges.map(edge => {
        const path = edge.querySelector('path');
        if (!path) return null;

        const d = path.getAttribute('d');
        const bbox = path.getBBox();

        return {
          id: edge.getAttribute('data-id'),
          pathLength: d ? d.length : 0,
          width: bbox.width,
          height: bbox.height,
          visible: path.checkVisibility ? path.checkVisibility() : true
        };
      }).filter(Boolean);

      const invisibleEdges = edgeData.filter(e => !e.visible);
      const veryShortEdges = edgeData.filter(e => e.pathLength < 10);

      return {
        totalEdges: edgeData.length,
        invisibleEdges: invisibleEdges.length,
        veryShortEdges: veryShortEdges.length,
        avgPathLength: edgeData.reduce((sum, e) => sum + e.pathLength, 0) / edgeData.length
      };
    });

    console.log(`\n🔍 Edge Quality Analysis:`);
    console.log(`   Total edges: ${edgeAnalysis.totalEdges}`);
    console.log(`   Invisible edges: ${edgeAnalysis.invisibleEdges}`);
    console.log(`   Very short edges: ${edgeAnalysis.veryShortEdges}`);
    console.log(`   Avg path length: ${edgeAnalysis.avgPathLength.toFixed(2)}px`);

    // Check for node overlaps
    const overlapAnalysis = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[class*="react-flow__node"]'));
      const nodeRects = nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          id: node.getAttribute('data-id'),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };
      });

      // Check for overlaps
      let overlapCount = 0;
      for (let i = 0; i < nodeRects.length; i++) {
        for (let j = i + 1; j < nodeRects.length; j++) {
          const a = nodeRects[i];
          const b = nodeRects[j];

          const overlap = !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
          );

          if (overlap) overlapCount++;
        }
      }

      return {
        totalNodes: nodeRects.length,
        overlaps: overlapCount
      };
    });

    console.log(`\n🎯 Node Overlap Analysis:`);
    console.log(`   Total nodes: ${overlapAnalysis.totalNodes}`);
    console.log(`   Overlapping pairs: ${overlapAnalysis.overlaps}`);

    // Test edge routing with smart edges
    console.log('\n🛣️  Analyzing smart edge routing...');
    const smartEdgeAnalysis = await page.evaluate(() => {
      const edges = Array.from(document.querySelectorAll('[class*="react-flow__edge"] path'));

      // Check if edges have multiple segments (indicating smart routing)
      const pathAnalysis = edges.map(path => {
        const d = path.getAttribute('d') || '';
        const segments = d.split(/[ML]/).filter(s => s.trim());
        const hasHorizontalVertical = /[HV]/.test(d);

        return {
          segments: segments.length,
          hasSmartRouting: segments.length > 2 || hasHorizontalVertical
        };
      });

      const smartRoutedEdges = pathAnalysis.filter(e => e.hasSmartRouting).length;
      const avgSegments = pathAnalysis.reduce((sum, e) => sum + e.segments, 0) / pathAnalysis.length;

      return {
        totalEdges: pathAnalysis.length,
        smartRoutedEdges,
        avgSegments: avgSegments.toFixed(2),
        smartRoutingPercentage: ((smartRoutedEdges / pathAnalysis.length) * 100).toFixed(1)
      };
    });

    console.log(`   Total edges analyzed: ${smartEdgeAnalysis.totalEdges}`);
    console.log(`   Smart-routed edges: ${smartEdgeAnalysis.smartRoutedEdges}`);
    console.log(`   Smart routing: ${smartEdgeAnalysis.smartRoutingPercentage}%`);
    console.log(`   Avg path segments: ${smartEdgeAnalysis.avgSegments}`);

    // Zoom out to see the full graph
    console.log('\n🔭 Zooming out to capture full graph...');
    await page.evaluate(() => {
      const viewport = document.querySelector('[class*="react-flow__viewport"]');
      if (viewport) {
        viewport.style.transform = 'translate(960px, 540px) scale(0.4)';
      }
    });
    await delay(1000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-zoomed-out.png'),
      fullPage: false
    });

    // Calculate overall quality score
    const report = {
      timestamp: new Date().toISOString(),
      url: PRODUCTION_URL,
      viewport: { width: 1920, height: 1080 },
      initialState: graphStats,
      edgeQuality: edgeAnalysis,
      nodeOverlaps: overlapAnalysis,
      smartEdgeRouting: smartEdgeAnalysis,
      screenshots: [
        '01-initial-state.png',
        '02-zoomed-out.png'
      ]
    };

    const qualityScore = calculateQualityScore(report);
    console.log(`\n⭐ Overall Layout Quality Score: ${qualityScore.score}/100`);
    console.log(`\n📝 Quality Breakdown:`);
    console.log(`   Edge routing: ${qualityScore.edgeRouting.toFixed(1)}/30`);
    console.log(`   Node positioning: ${qualityScore.nodePositioning.toFixed(1)}/30`);
    console.log(`   Smart edge usage: ${qualityScore.smartEdgeUsage.toFixed(1)}/20`);
    console.log(`   Visual clarity: ${qualityScore.visualClarity.toFixed(1)}/20`);

    // Save report
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'evaluation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\n✅ Evaluation complete!`);
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`📄 Report saved to: ${path.join(SCREENSHOTS_DIR, 'evaluation-report.json')}`);

    console.log('\n👉 Browser will close in 10 seconds. Press Ctrl+C to keep it open.');
    await delay(10000);

  } catch (error) {
    console.error('❌ Error during evaluation:', error.message);
    console.log('\n👉 Browser will stay open for debugging. Close it manually or press Ctrl+C.');
    await delay(300000); // Wait 5 minutes before closing
  } finally {
    await browser.close();
  }
}

function calculateQualityScore(report) {
  const scores = {
    edgeRouting: 0,
    nodePositioning: 0,
    smartEdgeUsage: 0,
    visualClarity: 0
  };

  // Edge routing quality (30 points)
  const invisibleRatio = report.edgeQuality.invisibleEdges / report.edgeQuality.totalEdges;
  const shortEdgeRatio = report.edgeQuality.veryShortEdges / report.edgeQuality.totalEdges;
  scores.edgeRouting = Math.max(0, 30 - (invisibleRatio * 15 + shortEdgeRatio * 15));

  // Node positioning (30 points)
  const overlapRatio = report.nodeOverlaps.overlaps / report.nodeOverlaps.totalNodes;
  scores.nodePositioning = Math.max(0, 30 - (overlapRatio * 30));

  // Smart edge usage (20 points)
  const smartRoutingPct = parseFloat(report.smartEdgeRouting.smartRoutingPercentage);
  scores.smartEdgeUsage = (smartRoutingPct / 100) * 20;

  // Visual clarity (20 points)
  const nodeEdgeRatio = report.edgeQuality.totalEdges / report.initialState.nodeCount;
  const clarityScore = nodeEdgeRatio < 3 ? 20 : Math.max(0, 20 - (nodeEdgeRatio - 3) * 5);
  scores.visualClarity = clarityScore;

  const totalScore = Math.round(
    scores.edgeRouting +
    scores.nodePositioning +
    scores.smartEdgeUsage +
    scores.visualClarity
  );

  return {
    ...scores,
    score: totalScore
  };
}

// Run evaluation
evaluateLayout().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
