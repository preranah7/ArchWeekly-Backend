import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db';
import { triggerNewsletterManually } from './services/scheduler';

async function main() {
  console.log('🚀 Starting ScaleWeekly Manual Scraper...\n');
  
  // Connect to MongoDB
  try {
    await connectDB();
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('⚠️  Aborting - database connection required.\n');
    process.exit(1);
  }
  
  // Run the complete newsletter workflow
  try {
    const result = await triggerNewsletterManually();
    
    if (!result || result.total === 0) {
      console.log('\n⚠️  No newsletters sent (no subscribers or articles).\n');
      process.exit(0);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SCRAPER COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully sent: ${result.sent}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   📬 Total subscribers: ${result.total}`);
    console.log(`   💾 Newsletter ID: ${result.newsletterId || 'N/A'}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Scraper failed:', error);
    process.exit(1);
  }
  
  // Gracefully exit
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
