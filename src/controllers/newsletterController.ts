//src/controllers/newsletterController.ts
import { Request, Response } from 'express';
import Article from '../models/Article';
import Newsletter from '../models/Newsletter';

const CONFIG = {
  LATEST_ARTICLES_LIMIT: 12,
  DEFAULT_PAGE_SIZE: 12,
  TOP_ARTICLES_DEFAULT: 10,
  CATEGORY_ARTICLES_LIMIT: 20,
} as const;

export const getLatest = async (req: Request, res: Response) => {
  try {
    const latest = await Article.find({ rank: { $exists: true, $ne: null } })
      .sort({ rank: 1 })
      .limit(CONFIG.LATEST_ARTICLES_LIMIT);

    if (!latest || latest.length === 0) {
      return res.status(404).json({ error: 'No newsletters found' });
    }

    res.json({
      newsletter: {
        title: 'Latest ArchWeekly Edition',
        date: latest[0].scrapedAt,
        totalArticles: latest.length,
      },
      articles: latest,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching latest newsletter' });
  }
};

export const getArchive = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = CONFIG.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const articles = await Article.find()
      .sort({ scrapedAt: -1, score: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Article.countDocuments();

    res.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching newsletter archive' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const newsletter = await Newsletter.findById(id);

    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    res.json({
      newsletter: {
        id: newsletter._id,
        title: newsletter.title,
        date: newsletter.date,
        sentAt: newsletter.sentAt,
        sentTo: newsletter.sentTo,
        status: newsletter.status,
      },
      articles: newsletter.articles,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching newsletter' });
  }
};

export const getByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const articles = await Article.find({ category })
      .sort({ score: -1 })
      .limit(CONFIG.CATEGORY_ARTICLES_LIMIT);

    res.json({ 
      category,
      count: articles.length,
      articles 
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching articles by category' });
  }
};

export const getTopRanked = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(
      50,
      Math.max(1, parseInt((req.query.limit as string) || String(CONFIG.TOP_ARTICLES_DEFAULT), 10))
    );

    const articles = await Article.find()
      .sort({ score: -1, scrapedAt: -1 })
      .limit(limit);

    res.json({ 
      count: articles.length,
      articles 
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching top ranked articles' });
  }
};