#!/usr/bin/env node

// Simple test script that doesn't require TypeScript
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function takeSimpleScreenshot() {
  console.log('Taking a simple screenshot...');
  
  let browser;
  try {
    // Check if puppeteer is installed
    try {
      require.resolve('puppeteer');
    } catch (e) {
      console.error('Puppeteer is not installed. Please run: npm install puppeteer');
      process.exit(1);
    }
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navigating to http://localhost:3000...');
    try {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
    } catch (error) {
      if (error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.error('\n❌ The development server is not running!');
        console.error('Please start it with: npm start');
        console.error('Then run this test again in another terminal.\n');
        process.exit(1);
      }
      throw error;
    }
    
    // Wait a bit for any animations
    await page.waitForTimeout(2000);
    
    // Create screenshots directory
    const screenshotDir = path.join(__dirname, 'screenshots', 'current');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotDir, `test-${Date.now()}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
    console.log('\nYou can now use the Read tool to view this screenshot and analyze it.');
    
  } catch (error) {
    console.error('Error taking screenshot:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  takeSimpleScreenshot();
}

module.exports = { takeSimpleScreenshot };