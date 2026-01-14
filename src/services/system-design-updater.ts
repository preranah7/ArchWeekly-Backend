//src/services/system-design-updater.ts
import cron from 'node-cron';
import { scrapeAllSystemDesignResources } from '../scrapers/system-design';
import { scoreSystemDesignResources } from '../ai/system-design-scorer';
import SystemDesignResource from '../models/SystemDesignResource';
import * as fs from 'fs';
import * as path from 'path';

async function runSystemDesignUpdate() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🎓 SYSTEM DESIGN UPDATE STARTED');
    console.log(`📅 ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log('='.repeat(70) + '\n');

    // Step 1: Scrape all resources
    console.log('🔍 Step 1: Scraping resources...\n');
    const rawResources = await scrapeAllSystemDesignResources();

    if (rawResources.length === 0) {
      console.log('⚠️  No resources found. Aborting update.\n');
      return [];
    }

    console.log(`✅ Scraped ${rawResources.length} raw resources\n`);

    // Step 2: Score with Gemini AI
    console.log('🤖 Step 2: Scoring resources with Gemini AI...\n');
    const scoredResources = await scoreSystemDesignResources(rawResources);
    console.log(`✅ Scored ${scoredResources.length} resources\n`);

    // Step 3: Save to MongoDB
    console.log('💾 Step 3: Saving to MongoDB...\n');

    const top30 = scoredResources.slice(0, 30);

    for (let i = 0; i < top30.length; i++) {
      const resource = top30[i];
      await SystemDesignResource.findOneAndUpdate(
        { url: resource.url },
        {
          title: resource.title,
          url: resource.url,
          description: resource.description,
          source: resource.source,
          type: resource.type,
          category: resource.category,
          difficulty: resource.difficulty,
          score: resource.score,
          reasoning: resource.reasoning,
          topics: resource.topics,
          hasVisuals: resource.hasVisuals,
          thumbnail: resource.thumbnail,
          diagrams: resource.diagrams,
          keyLearnings: resource.keyLearnings,
          estimatedTime: resource.estimatedTime,
          rank: i + 1,
          scrapedAt: new Date(),
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    const remaining = scoredResources.slice(30);
    for (const resource of remaining) {
      await SystemDesignResource.findOneAndUpdate(
        { url: resource.url },
        {
          title: resource.title,
          url: resource.url,
          description: resource.description,
          source: resource.source,
          type: resource.type,
          category: resource.category,
          difficulty: resource.difficulty,
          score: resource.score,
          reasoning: resource.reasoning,
          topics: resource.topics,
          hasVisuals: resource.hasVisuals,
          thumbnail: resource.thumbnail,
          diagrams: resource.diagrams,
          keyLearnings: resource.keyLearnings,
          estimatedTime: resource.estimatedTime,
          scrapedAt: new Date(),
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Saved ${scoredResources.length} resources to MongoDB\n`);

    // Step 4: Generate JSON file
    console.log('📄 Step 4: Generating JSON file...\n');

    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedDate: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        totalResources: scoredResources.length,
        topFeatured: top30.length,
        poweredBy: 'Gemini AI + GitHub + YouTube + Engineering Blogs',
        sources: {
          github: scoredResources.filter(r => r.source.includes('github')).length,
          youtube: scoredResources.filter(r => r.source.includes('youtube')).length,
          blogs: scoredResources.filter(r => r.source.includes('blog')).length,
        },
      },
      featuredResources: top30.map((r, i) => ({
        rank: i + 1,
        title: r.title,
        url: r.url,
        description: r.description,
        source: r.source,
        type: r.type,
        category: r.category,
        difficulty: r.difficulty,
        score: r.score,
        reasoning: r.reasoning,
        topics: r.topics,
        keyLearnings: r.keyLearnings,
        estimatedTime: r.estimatedTime,
        hasVisuals: r.hasVisuals,
        thumbnail: r.thumbnail,
      })),
    };

    const jsonPath = path.join(process.cwd(), 'system-design-resources.json');
    fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2));
    console.log(`✅ JSON saved: ${jsonPath}\n`);

    console.log('\n' + '='.repeat(70));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Total Resources: ${scoredResources.length}`);
    console.log(`🏆 Featured (Top 30): ${top30.length}`);
    console.log('='.repeat(70) + '\n');

    console.log('✅ System Design update completed successfully!\n');
    
    return scoredResources;

  } catch (error) {
    console.error('\n❌ System Design update failed:', error);
    throw error;
  }
}

export function scheduleMonthlySystemDesignUpdate() {
  cron.schedule('0 9 1 * *', async () => {
    console.log('\n' + '='.repeat(70));
    console.log('⏰ MONTHLY SYSTEM DESIGN UPDATE TRIGGERED');
    console.log(`📅 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('='.repeat(70) + '\n');

    await runSystemDesignUpdate();

  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ Monthly System Design update scheduled: 1st of every month at 9:00 AM IST');
}

export async function triggerSystemDesignUpdateManually() {
  console.log('\n🔧 MANUAL TRIGGER: Starting System Design update...\n');
  return await runSystemDesignUpdate();
}