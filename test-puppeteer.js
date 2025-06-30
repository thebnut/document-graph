const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('Starting Puppeteer test...');
  
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✓ Browser launched successfully');
    
    // Create a new page
    const page = await browser.newPage();
    console.log('✓ New page created');
    
    // Navigate to a test URL
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    console.log('✓ Navigated to example.com');
    
    // Get page title
    const title = await page.title();
    console.log(`✓ Page title: "${title}"`);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('✓ Screenshot saved as test-screenshot.png');
    
    // Close browser
    await browser.close();
    console.log('✓ Browser closed');
    
    console.log('\n🎉 Puppeteer is working correctly!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the test
testPuppeteer();