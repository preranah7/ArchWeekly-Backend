//src/services/system-design-updater.ts
import cron from 'node-cron';
import { scrapeAllSystemDesignResources } from '../scrapers/system-design';
import { scoreSystemDesignResources } from '../ai/system-design-scorer';
import SystemDesignResource from '../models/SystemDesignResource';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  TOP_FEATURED: 30,
  OUTPUT_JSON: 'system-design-resources.json',
  CRON_MONTHLY: '0 9 1 * *',
  TIMEZONE: 'Asia/Kolkata',
} as const;

async function runSystemDesignUpdate() {
  try {
    const rawResources = await scrapeAllSystemDesignResources();

    if (rawResources.length === 0) {
      return [];
    }

    const scoredResources = await scoreSystemDesignResources(rawResources);

    const top30 = scoredResources.slice(0, CONFIG.TOP_FEATURED);

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

    const remaining = scoredResources.slice(CONFIG.TOP_FEATURED);
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

    const jsonPath = path.join(process.cwd(), CONFIG.OUTPUT_JSON);
    fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2));
    
    return scoredResources;
  } catch (error) {
    throw error;
  }
}

export function scheduleMonthlySystemDesignUpdate() {
  cron.schedule(CONFIG.CRON_MONTHLY, async () => {
    await runSystemDesignUpdate();
  }, {
    timezone: CONFIG.TIMEZONE
  });
}

export async function triggerSystemDesignUpdateManually() {
  return await runSystemDesignUpdate();
}