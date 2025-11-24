/**
 * Layout Quality Evaluation Script
 * Uses Puppeteer to capture and analyze the graph visualization
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PRODUCTION_URL = 'https://lifemap-six.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'layout-evaluation');

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function evaluateLayout() {
  console.log('🚀 Starting layout evaluation...\n');

  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('📡 Navigating to:', PRODUCTION_URL);

    // Set localStorage to use sample data and skip Google Drive auth
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('useStandaloneModel', 'false');
      localStorage.setItem('useExpandedData', 'true');
    });

    await page.goto(PRODUCTION_URL, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Check for and dismiss any authentication modals
    console.log('🔍 Checking for authentication modal...');
    await delay(2000);

    const modalPresent = await page.evaluate(() => {
      // Look for modal with "Connect to Google Drive" text
      const modal = Array.from(document.querySelectorAll('div')).find(el =>
        el.textContent.includes('Connect to Google Drive')
      );
      return !!modal;
    });

    if (modalPresent) {
      console.log('   Found auth modal, attempting to bypass...');
      // Press Escape to close modal or click outside it
      await page.keyboard.press('Escape');
      await delay(1000);

      // If that didn't work, try clicking the backdrop
      const backdropClicked = await page.evaluate(() => {
        const backdrop = document.querySelector('[class*="fixed"][class*="inset-0"]');
        if (backdrop) {
          backdrop.click();
          return true;
        }
        return false;
      });

      if (backdropClicked) {
        console.log('   Clicked backdrop to dismiss modal');
      }

      await delay(1000);
    }

    // Wait for ReactFlow to load
    console.log('⏳ Waiting for graph to render...');

    // Take initial screenshot to see what's loaded
    await delay(2000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '00-page-loaded.png'),
      fullPage: false
    });

    // Check what selectors are available
    const availableSelectors = await page.evaluate(() => {
      return {
        hasReactFlow: !!document.querySelector('[class*="react-flow"]'),
        hasReactFlowExact: !!document.querySelector('.react-flow'),
        hasReactFlowRenderer: !!document.querySelector('.react-flow__renderer'),
        hasNodes: !!document.querySelector('[class*="react-flow__node"]'),
        hasEdges: !!document.querySelector('[class*="react-flow__edge"]'),
        allClasses: Array.from(document.querySelectorAll('div[class]'))
          .slice(0, 10)
          .map(el => el.className)
      };
    });

    console.log('   Available selectors:', availableSelectors);

    // Try different selectors
    let reactFlowFound = false;
    const selectorsToTry = [
      '[class*="react-flow"]',
      '.react-flow',
      '.react-flow__renderer',
      '[class*="ReactFlow"]'
    ];

    for (const selector of selectorsToTry) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`   ✓ Found ReactFlow using selector: ${selector}`);
        reactFlowFound = true;
        break;
      } catch (e) {
        console.log(`   ✗ Selector not found: ${selector}`);
      }
    }

    if (!reactFlowFound) {
      throw new Error('Could not find ReactFlow container on page');
    }

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

    // Try to expand a node
    console.log('\n🔄 Testing node expansion...');
    const expandableNode = await page.$('[class*="react-flow__node"] svg:first-of-type');

    if (expandableNode) {
      await expandableNode.click();
      await delay(2000); // Wait for animation

      console.log('📸 Capturing expanded state...');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '02-expanded-state.png'),
        fullPage: false
      });

      const expandedStats = await page.evaluate(() => {
        const nodes = document.querySelectorAll('[class*="react-flow__node"]');
        const edges = document.querySelectorAll('[class*="react-flow__edge"]');
        return {
          nodeCount: nodes.length,
          edgeCount: edges.length,
        };
      });

      console.log(`   After expansion:`);
      console.log(`   Nodes visible: ${expandedStats.nodeCount} (+${expandedStats.nodeCount - graphStats.nodeCount})`);
      console.log(`   Edges visible: ${expandedStats.edgeCount} (+${expandedStats.edgeCount - graphStats.edgeCount})`);
    } else {
      console.log('   ⚠️  No expandable nodes found');
    }

    // Zoom out to see the full graph
    console.log('\n🔭 Zooming out to capture full graph...');
    await page.evaluate(() => {
      const viewport = document.querySelector('[class*="react-flow__viewport"]');
      if (viewport) {
        viewport.style.transform = 'translate(960px, 540px) scale(0.5)';
      }
    });
    await delay(1000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-zoomed-out.png'),
      fullPage: false
    });

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

    // Generate evaluation report
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
        '02-expanded-state.png',
        '03-zoomed-out.png'
      ]
    };

    // Calculate overall quality score
    const qualityScore = calculateQualityScore(report);
    console.log(`\n⭐ Overall Layout Quality Score: ${qualityScore.score}/100`);
    console.log(`\n📝 Quality Breakdown:`);
    console.log(`   Edge routing: ${qualityScore.edgeRouting}/30`);
    console.log(`   Node positioning: ${qualityScore.nodePositioning}/30`);
    console.log(`   Smart edge usage: ${qualityScore.smartEdgeUsage}/20`);
    console.log(`   Visual clarity: ${qualityScore.visualClarity}/20`);

    // Save report
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'evaluation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\n✅ Evaluation complete!`);
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`📄 Report saved to: ${path.join(SCREENSHOTS_DIR, 'evaluation-report.json')}`);

  } catch (error) {
    console.error('❌ Error during evaluation:', error.message);
    throw error;
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
