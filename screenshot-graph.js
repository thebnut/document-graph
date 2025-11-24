/**
 * Simple screenshot capture - opens browser, waits for manual interaction, then captures
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PRODUCTION_URL = 'https://lifemap-six.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'layout-evaluation');
const WAIT_TIME = 60000; // Wait 60 seconds for user to log in

async function captureScreenshots() {
  console.log('🚀 Opening browser...\n');

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('📡 Navigating to:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 60000 });

    console.log(`\n⏰ Waiting ${WAIT_TIME/1000} seconds for you to log in and load the graph...`);
    console.log('   (Browser will automatically capture screenshots after this time)\n');

    await new Promise(resolve => setTimeout(resolve, WAIT_TIME));

    console.log('📸 Capturing screenshots...\n');

    // Initial state
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'graph-initial.png'),
      fullPage: false
    });
    console.log('✓ Saved: graph-initial.png');

    // Zoom out
    await page.evaluate(() => {
      const viewport = document.querySelector('[class*="react-flow__viewport"]');
      if (viewport) {
        viewport.style.transform = 'translate(960px, 540px) scale(0.4)';
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'graph-zoomed-out.png'),
      fullPage: false
    });
    console.log('✓ Saved: graph-zoomed-out.png');

    // Get stats
    const stats = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[class*="react-flow__node"]');
      const edges = document.querySelectorAll('[class*="react-flow__edge"]');

      return {
        nodes: nodes.length,
        edges: edges.length
      };
    });

    console.log(`\n📊 Graph has ${stats.nodes} nodes and ${stats.edges} edges`);
    console.log(`\n✅ Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\nBrowser will stay open for 10 more seconds...');

    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed');
  }
}

captureScreenshots();
