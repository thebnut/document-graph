#!/usr/bin/env node

// Quick test to verify Puppeteer is working
const puppeteer = require('puppeteer');
const path = require('path');

async function testPuppeteer() {
  console.log('Testing Puppeteer installation...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✓ Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('✓ New page created');
    
    await page.setViewport({ width: 1280, height: 720 });
    console.log('✓ Viewport set');
    
    // Navigate to a simple test page
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    console.log('✓ Navigated to example.com');
    
    // Take a screenshot
    const screenshotPath = path.join(__dirname, 'test-puppeteer-screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ Screenshot saved to: ${screenshotPath}`);
    
    // Get page title
    const title = await page.title();
    console.log(`✓ Page title: "${title}"`);
    
    console.log('\n✅ Puppeteer is working correctly!');
    console.log('\nYou can now run visual tests on your local development server.');
    console.log('1. Start your dev server: npm start');
    console.log('2. Run visual tests: npm run visual:simple');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testPuppeteer();