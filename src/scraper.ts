//src/scraper.ts
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db';
import { triggerNewsletterManually } from './services/scheduler';

async function main() {
  try {
    await connectDB();
  } catch (error) {
    process.exit(1);
  }
  
  try {
    const result = await triggerNewsletterManually();
    
    if (!result || result.total === 0) {
      process.exit(0);
    }
    
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main().catch(() => {
  process.exit(1);
});