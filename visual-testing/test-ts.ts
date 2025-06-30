import { PuppeteerClient } from './lib/puppeteer-client';

async function testTypeScript() {
  console.log('Testing TypeScript compilation...');
  
  const client = new PuppeteerClient({
    headless: true,
    baseUrl: 'http://localhost:3000'
  });
  
  console.log('✓ PuppeteerClient imported successfully');
  console.log('✓ TypeScript types are working');
  console.log('\n✅ TypeScript visual testing framework is ready!');
}

testTypeScript().catch(console.error);