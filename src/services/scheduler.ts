import cron from 'node-cron';
import { sendNewsletterToAll } from './newsletter-sender';
import { runAllScrapers } from '../scrapers';
import { scoreArticles } from '../ai/gemini-scorer';
import Article from '../models/Article';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Run complete newsletter workflow:
 * 1. Scrape articles
 * 2. Score with Gemini
 * 3. Save to MongoDB
 * 4. Generate JSON file
 * 5. Send to subscribers
 */
async function runNewsletterWorkflow() {
  try {
    // Step 1: Scrape articles
    console.log('📰 Step 1: Running scrapers...\n');
    const rawArticles = await runAllScrapers();
    console.log(`✅ Scraped ${rawArticles.length} articles\n`);

    if (rawArticles.length === 0) {
      console.log('⚠️ No articles found. Aborting newsletter send.\n');
      // Return empty result instead of undefined
      return {
        total: 0,
        sent: 0,
        failed: 0,
        results: [],
        newsletterId: undefined,
      };
    }

    // Step 2: Score articles with Gemini
    console.log('🤖 Step 2: Scoring articles with AI...\n');
    const scoredArticles = await scoreArticles(rawArticles);
    console.log(`✅ Scored ${scoredArticles.length} articles\n`);

// Step 3: Save to MongoDB (update or insert)
console.log('💾 Step 3: Saving to MongoDB...\n');

// Clear old ranks first (so only latest articles have ranks)
await Article.updateMany({}, { $unset: { rank: "" } });

// Save top 12 with ranks
const top12Articles = scoredArticles.slice(0, 12);
for (let i = 0; i < top12Articles.length; i++) {
  const article = top12Articles[i];
  await Article.findOneAndUpdate(
    { url: article.url },
    {
      title: article.title,
      url: article.url,
      source: article.source,
      description: article.description,
      score: article.score,
      category: article.category,
      reasoning: article.reasoning,
      keyInsights: article.keyInsights,
      upvotes: article.upvotes,
      comments: article.comments,
      rank: i + 1,  // Rank 1-12
      scrapedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

// Save remaining articles without ranks (for archive)
const remainingArticles = scoredArticles.slice(12);
for (const article of remainingArticles) {
  await Article.findOneAndUpdate(
    { url: article.url },
    {
      title: article.title,
      url: article.url,
      source: article.source,
      description: article.description,
      score: article.score,
      category: article.category,
      reasoning: article.reasoning,
      keyInsights: article.keyInsights,
      upvotes: article.upvotes,
      comments: article.comments,
      scrapedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}
console.log(`✅ Saved to MongoDB\n`);


    // Step 4: Generate JSON file for email sending
    console.log('📄 Step 4: Generating newsletter JSON...\n');
    const topArticles = scoredArticles.slice(0, 12).map((article, index) => ({
      rank: index + 1,
      title: article.title,
      url: article.url,
      source: article.source,
      description: article.description,
      score: article.score,
      category: article.category,
      reasoning: article.reasoning,
      keyInsights: article.keyInsights,
    }));

    const newsletterData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedDate: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        totalScraped: rawArticles.length,
        topSelected: topArticles.length,
        poweredBy: 'Gemini AI + Custom Scrapers',
      },
      topArticles,
    };

    const jsonPath = path.join(process.cwd(), 'scaleweekly-curated.json');
    fs.writeFileSync(jsonPath, JSON.stringify(newsletterData, null, 2));
    console.log(`✅ JSON saved: ${jsonPath}\n`);

    // Step 5: Send newsletters
    console.log('📧 Step 5: Sending newsletters...\n');
    const result = await sendNewsletterToAll();
    
    console.log('\n✅ Newsletter workflow complete!');
    console.log(`📊 Sent to ${result.sent}/${result.total} subscribers`);
    console.log(`💾 Newsletter ID: ${result.newsletterId}\n`);

    return result;

  } catch (error) {
    console.error('\n❌ Newsletter workflow failed:', error);
    throw error;
  }
}

/**
 * Schedule weekly newsletter
 * Runs every Sunday at 9:00 AM IST
 */
export function scheduleWeeklyNewsletter() {
  // Cron format: minute hour day month weekday
  // '0 9 * * 0' = Every Sunday at 9:00 AM
  
  cron.schedule('0 9 * * 0', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('⏰ WEEKLY AUTOMATION TRIGGERED');
    console.log(`📅 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('='.repeat(60) + '\n');

    await runNewsletterWorkflow();

  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ Weekly newsletter scheduled: Every Sunday at 9:00 AM IST');
}

/**
 * For testing: Schedule newsletter to run every 5 minutes
 * Uncomment this during development to test automation
 */
export function scheduleTestNewsletter() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('\n🧪 TEST: Running newsletter automation...\n');
    await runNewsletterWorkflow();
  });

  console.log('🧪 TEST: Newsletter scheduled every 5 minutes');
}

/**
 * Manual trigger for testing (call this from API endpoint)
 */
export async function triggerNewsletterManually() {
  console.log('\n🔧 MANUAL TRIGGER: Starting newsletter workflow...\n');
  return await runNewsletterWorkflow();
}
