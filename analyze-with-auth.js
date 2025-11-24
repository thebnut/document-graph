/**
 * Layout Analysis with Manual Authentication
 * Step 1: Opens browser and waits for login
 * Step 2: Runs analysis after user confirms
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PRODUCTION_URL = 'https://lifemap-six.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'layout-evaluation');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForEnter = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('Press ENTER when logged in and graph is loaded...', () => {
      rl.close();
      resolve();
    });
  });
};

(async () => {
  console.log('🚀 Launching browser...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('📡 Navigating to:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0' });

    console.log('\n✋ Browser is ready!');
    console.log('👉 Please log in to Google Drive in the browser window\n');

    // WAIT FOR USER
    await waitForEnter();

    console.log('\n✅ Starting analysis...\n');
    await delay(2000);

    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Capture initial screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'analysis-initial.png')
    });
    console.log('📸 Captured initial view');

    // Get graph stats
    const stats = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[class*="react-flow__node"]');
      const edges = document.querySelectorAll('[class*="react-flow__edge"]');
      return { nodes: nodes.length, edges: edges.length };
    });

    console.log(`\n📊 Graph: ${stats.nodes} nodes, ${stats.edges} edges`);

    // Edge analysis
    console.log('\n🛣️  Analyzing edge routing...');
    const edgeAnalysis = await page.evaluate(() => {
      const edges = Array.from(document.querySelectorAll('[class*="react-flow__edge"] path'));

      const edgeData = edges.map(path => {
        const d = path.getAttribute('d') || '';
        const segments = d.split(/[ML]/).filter(s => s.trim());
        const hasHV = /[HV]/.test(d);

        return {
          pathLength: d.length,
          segments: segments.length,
          hasSmartRouting: segments.length > 2 || hasHV
        };
      });

      const smartCount = edgeData.filter(e => e.hasSmartRouting).length;
      const avgPath = edgeData.reduce((s, e) => s + e.pathLength, 0) / edgeData.length;
      const avgSegs = edgeData.reduce((s, e) => s + e.segments, 0) / edgeData.length;

      return {
        total: edgeData.length,
        smartRouted: smartCount,
        smartPct: ((smartCount / edgeData.length) * 100).toFixed(1),
        avgPathLength: avgPath.toFixed(2),
        avgSegments: avgSegs.toFixed(2)
      };
    });

    console.log(`   Smart-routed: ${edgeAnalysis.smartRouted}/${edgeAnalysis.total} (${edgeAnalysis.smartPct}%)`);
    console.log(`   Avg path length: ${edgeAnalysis.avgPathLength}px`);
    console.log(`   Avg segments: ${edgeAnalysis.avgSegments}`);

    // Node overlap analysis
    console.log('\n🎯 Checking for node overlaps...');
    const overlap = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[class*="react-flow__node"]'));
      const rects = nodes.map(n => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });

      let count = 0;
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          if (!(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)) {
            count++;
          }
        }
      }
      return { total: rects.length, overlaps: count };
    });

    console.log(`   Overlapping pairs: ${overlap.overlaps}`);

    // Zoom out
    console.log('\n🔭 Zooming out...');
    await page.evaluate(() => {
      const vp = document.querySelector('[class*="react-flow__viewport"]');
      if (vp) vp.style.transform = 'translate(960px, 540px) scale(0.4)';
    });
    await delay(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'analysis-zoomed.png')
    });
    console.log('📸 Captured zoomed view');

    // Quality score
    const edgeScore = Math.min(30, (parseFloat(edgeAnalysis.smartPct) / 100) * 30);
    const nodeScore = overlap.overlaps === 0 ? 30 : Math.max(0, 30 - overlap.overlaps * 10);
    const total = Math.round(edgeScore + nodeScore + 40);

    console.log(`\n⭐ Layout Quality Score: ${total}/100`);
    console.log(`   Edge routing: ${edgeScore.toFixed(1)}/30`);
    console.log(`   Node positioning: ${nodeScore.toFixed(1)}/30`);

    console.log(`\n✅ Analysis complete!`);
    console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}\n`);

    console.log('Browser will close in 10 seconds...');
    await delay(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('👋 Browser closed');
  }
})();
