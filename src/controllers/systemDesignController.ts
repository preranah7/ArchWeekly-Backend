//src/controllers/systemDesignControllers.ts
import { Request, Response } from 'express';
import SystemDesignResource from '../models/SystemDesignResource';

const CONFIG = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  FEATURED_LIMIT: 10,
  CATEGORY_DEFAULT_LIMIT: 20,
  SEARCH_DEFAULT_LIMIT: 20,
} as const;

const VALID_CATEGORIES = [
  'Fundamentals',
  'Intermediate',
  'Advanced',
  'Case Studies',
  'Interview Problems'
] as const;

const VALID_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

const parseLimit = (limit: string | undefined, defaultLimit: number, maxLimit: number = CONFIG.MAX_LIMIT): number => {
  const parsed = parseInt(limit || String(defaultLimit), 10);
  return Math.min(Math.max(1, parsed), maxLimit);
};

export const getAllResources = async (req: Request, res: Response) => {
  try {
    const { category, difficulty, limit } = req.query;
    
    const query: any = {};
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    
    const limitValue = parseLimit(limit as string, CONFIG.DEFAULT_LIMIT);
    
    const resources = await SystemDesignResource.find(query)
      .sort({ score: -1, rank: 1 })
      .limit(limitValue);
    
    res.json({
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching resources' });
  }
};

export const getFeaturedResources = async (req: Request, res: Response) => {
  try {
    const featured = await SystemDesignResource.find()
      .sort({ score: -1 })
      .limit(CONFIG.FEATURED_LIMIT);
    
    res.json({
      count: featured.length,
      resources: featured,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching featured resources' });
  }
};

export const getByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { limit } = req.query;
    
    if (!VALID_CATEGORIES.includes(category as any)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        validCategories: VALID_CATEGORIES
      });
    }
    
    const limitValue = parseLimit(limit as string, CONFIG.CATEGORY_DEFAULT_LIMIT);
    
    const resources = await SystemDesignResource.find({ category })
      .sort({ score: -1 })
      .limit(limitValue);
    
    res.json({
      category,
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching resources by category' });
  }
};

export const getByDifficulty = async (req: Request, res: Response) => {
  try {
    const { difficulty } = req.params;
    const { limit } = req.query;
    
    if (!VALID_DIFFICULTIES.includes(difficulty as any)) {
      return res.status(400).json({ 
        error: 'Invalid difficulty',
        validDifficulties: VALID_DIFFICULTIES
      });
    }
    
    const limitValue = parseLimit(limit as string, CONFIG.CATEGORY_DEFAULT_LIMIT);
    
    const resources = await SystemDesignResource.find({ difficulty })
      .sort({ score: -1 })
      .limit(limitValue);
    
    res.json({
      difficulty,
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching resources by difficulty' });
  }
};

export const getResourceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const resource = await SystemDesignResource.findById(id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({ resource });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching resource' });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const [
      total,
      byCategory,
      byDifficulty,
      bySource,
    ] = await Promise.all([
      SystemDesignResource.countDocuments(),
      SystemDesignResource.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      SystemDesignResource.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
      ]),
      SystemDesignResource.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
    ]);
    
    res.json({
      total,
      byCategory: byCategory.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      byDifficulty: byDifficulty.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      bySource: bySource.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching statistics' });
  }
};

export const searchResources = async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const limitValue = parseLimit(limit as string, CONFIG.SEARCH_DEFAULT_LIMIT);
    
    const resources = await SystemDesignResource.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { topics: { $in: [new RegExp(q, 'i')] } },
      ]
    })
      .sort({ score: -1 })
      .limit(limitValue);
    
    res.json({
      query: q,
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while searching resources' });
  }
};