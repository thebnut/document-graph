/**
 * Interactive Puppeteer REPL
 * Run this script directly in your terminal: node puppeteer-interactive.js
 */

const puppeteer = require('puppeteer');
const repl = require('repl');
const path = require('path');

const PRODUCTION_URL = 'https://lifemap-six.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'layout-evaluation');

(async () => {
  console.log('🚀 Launching Puppeteer browser...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('✅ Browser launched!\n');
  console.log('📍 Navigate to production: await page.goto(PRODUCTION_URL)');
  console.log('📸 Take screenshot: await page.screenshot({ path: \'screenshot.png\' })\n');
  console.log('Available variables:');
  console.log('  browser          - Puppeteer browser instance');
  console.log('  page             - Current page');
  console.log('  PRODUCTION_URL   - https://lifemap-six.vercel.app');
  console.log('  SCREENSHOTS_DIR  - ./layout-evaluation\n');
  console.log('Type .exit or press Ctrl+C twice to close\n');

  // Start REPL
  const r = repl.start({
    prompt: 'puppeteer> ',
    useGlobal: true
  });

  // Add variables to REPL context
  r.context.browser = browser;
  r.context.page = page;
  r.context.PRODUCTION_URL = PRODUCTION_URL;
  r.context.SCREENSHOTS_DIR = SCREENSHOTS_DIR;

  // Helper function for delays
  r.context.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Clean up on exit
  r.on('exit', async () => {
    console.log('\n👋 Closing browser...');
    await browser.close();
    process.exit(0);
  });
})();
