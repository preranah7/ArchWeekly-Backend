import { Request, Response } from 'express';
import Article from '../models/Article';
import Newsletter from '../models/Newsletter';

/**
 * Get latest newsletter
 * GET /api/newsletters/latest
 */
export const getLatest = async (req: Request, res: Response) => {
  try {
    // Get top 12 RANKED articles (most recent newsletter)
    const latest = await Article.find({ rank: { $exists: true, $ne: null } })
      .sort({ rank: 1 })  // Sort by rank 1-12
      .limit(12);

    if (!latest || latest.length === 0) {
      return res.status(404).json({ error: 'No newsletters found' });
    }

    res.json({
      newsletter: {
        title: 'Latest ScaleWeekly Edition',
        date: latest[0].scrapedAt,
        totalArticles: latest.length,
      },
      articles: latest,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};


/**
 * Get newsletter archive
 * GET /api/newsletters
 */
export const getArchive = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = 12;
    const skip = (page - 1) * limit;

    // Get all articles, sorted by most recent first
    const articles = await Article.find()
      .sort({ scrapedAt: -1, score: -1 })  // Sort by date, then score
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
    res.status(500).json({ error: (error as Error).message });
  }
};


/**
 * Get newsletter by ID
 * GET /api/newsletters/:id
 */
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
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get articles by category
 * GET /api/newsletters/category/:category
 */
export const getByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const articles = await Article.find({ category })
      .sort({ score: -1 })
      .limit(20);

    res.json({ 
      category,
      count: articles.length,
      articles 
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get top ranked articles
 * GET /api/newsletters/top
 */
export const getTopRanked = async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '10', 10);

    const articles = await Article.find()
      .sort({ score: -1, scrapedAt: -1 })
      .limit(limit);

    res.json({ 
      count: articles.length,
      articles 
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
