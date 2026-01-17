//src/services/scheduler.ts
import cron from 'node-cron';
import { sendNewsletterToAll } from './newsletter-sender';
import { runAllScrapers } from '../scrapers';
import { scoreArticles } from '../ai/gemini-scorer';
import Article from '../models/Article';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  TOP_ARTICLES_FEATURED: 12,
  NEWSLETTER_JSON: 'archweekly-curated.json',
  CRON_WEEKLY: '0 9 * * 0',
  TIMEZONE: 'Asia/Kolkata',
} as const;

async function runNewsletterWorkflow() {
  try {
    const rawArticles = await runAllScrapers();

    if (rawArticles.length === 0) {
      return {
        total: 0,
        sent: 0,
        failed: 0,
        results: [],
        newsletterId: undefined,
      };
    }

    const scoredArticles = await scoreArticles(rawArticles);

    await Article.updateMany({}, { $unset: { rank: "" } });

    const top12Articles = scoredArticles.slice(0, CONFIG.TOP_ARTICLES_FEATURED);
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
          rank: i + 1,
          scrapedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    const remainingArticles = scoredArticles.slice(CONFIG.TOP_ARTICLES_FEATURED);
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

    const topArticles = scoredArticles.slice(0, CONFIG.TOP_ARTICLES_FEATURED).map((article, index) => ({
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

    const jsonPath = path.join(process.cwd(), CONFIG.NEWSLETTER_JSON);
    fs.writeFileSync(jsonPath, JSON.stringify(newsletterData, null, 2));

    const result = await sendNewsletterToAll();

    return result;
  } catch (error) {
    throw error;
  }
}

export function scheduleWeeklyNewsletter() {
  cron.schedule(CONFIG.CRON_WEEKLY, async () => {
    await runNewsletterWorkflow();
  }, {
    timezone: CONFIG.TIMEZONE
  });
}

export function scheduleTestNewsletter() {
  cron.schedule('*/5 * * * *', async () => {
    await runNewsletterWorkflow();
  });
}

export async function triggerNewsletterManually() {
  return await runNewsletterWorkflow();
}