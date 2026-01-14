//src/system-design-scraper.ts
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db';
import { scrapeAllSystemDesignResources } from './scrapers/system-design';
import { scoreSystemDesignResources } from './ai/system-design-scorer';
import SystemDesignResource from './models/SystemDesignResource';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main System Design scraper workflow
 * Now includes GitHub + YouTube + Engineering Blogs
 */
async function runSystemDesignScraper() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🎓 SYSTEM DESIGN RESOURCE SCRAPER (PHASE 2)');
    console.log('='.repeat(70) + '\n');

    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected\n');

    // Step 1: Scrape all resources
    console.log('🔍 Step 1: Scraping all resources...\n');
    const rawResources = await scrapeAllSystemDesignResources();

    if (rawResources.length === 0) {
      console.log('⚠️  No resources found. Exiting.\n');
      process.exit(0);
    }

    console.log(`✅ Scraped ${rawResources.length} raw resources\n`);

    // Step 2: Score resources with Gemini AI
    console.log('🤖 Step 2: Scoring resources with Gemini AI...\n');
    const scoredResources = await scoreSystemDesignResources(rawResources);
    console.log(`✅ Scored ${scoredResources.length} resources\n`);

    // Step 3: Save to MongoDB
    console.log('💾 Step 3: Saving to MongoDB...\n');

    // Assign ranks to top 30 resources
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

    // Save remaining resources without ranks
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

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Total Resources: ${scoredResources.length}`);
    console.log(`🏆 Featured (Top 30): ${top30.length}`);
    console.log(`📦 Sources Breakdown:`);
    console.log(`   📘 GitHub: ${outputData.metadata.sources.github}`);
    console.log(`   🎥 YouTube: ${outputData.metadata.sources.youtube}`);
    console.log(`   📝 Blogs: ${outputData.metadata.sources.blogs}`);
    console.log(`💾 Saved to MongoDB: ${scoredResources.length}`);
    console.log(`📄 JSON file: system-design-resources.json`);
    console.log('='.repeat(70) + '\n');

    // Show top 5
    console.log('🏆Top 5 System Design Resources:\n');
    top30.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. ${r.title} [${r.type.toUpperCase()}]`);
      console.log(`Source: ${r.source}`);
      console.log(`Category: ${r.category} | Difficulty: ${r.difficulty} | Score: ${r.score}/10`);
      console.log(`Topics: ${r.topics.join(', ')}`);
      console.log(`${r.reasoning}\n`);
    });
    console.log('✅ System Design scraper completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Scraper failed:', error);
    process.exit(1);
  }
}

// Run the scraper
runSystemDesignScraper();