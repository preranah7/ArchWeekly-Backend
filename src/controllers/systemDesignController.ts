//src/controllers/systemDesignControllers.ts
import { Request, Response } from 'express';
import SystemDesignResource from '../models/SystemDesignResource';

/**
 * Get all System Design resources
 * GET /api/system-design
 * Query params: category, difficulty, limit
 */
export const getAllResources = async (req: Request, res: Response) => {
  try {
    const { category, difficulty, limit = '50' } = req.query;
    
    // Build query
    const query: any = {};
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    
    const resources = await SystemDesignResource.find(query)
      .sort({ score: -1, rank: 1 }) // Sort by score, then rank
      .limit(parseInt(limit as string));
    
    res.json({
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get top featured resources (top 10 by score)
 * GET /api/system-design/featured
 */
export const getFeaturedResources = async (req: Request, res: Response) => {
  try {
    const featured = await SystemDesignResource.find()
      .sort({ score: -1 })
      .limit(10);
    
    res.json({
      count: featured.length,
      resources: featured,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get resources by category
 * GET /api/system-design/category/:category
 */
export const getByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { limit = '20' } = req.query;
    
    const validCategories = [
      'Fundamentals',
      'Intermediate',
      'Advanced',
      'Case Studies',
      'Interview Problems'
    ];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        validCategories 
      });
    }
    
    const resources = await SystemDesignResource.find({ category })
      .sort({ score: -1 })
      .limit(parseInt(limit as string));
    
    res.json({
      category,
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get resources by difficulty
 * GET /api/system-design/difficulty/:difficulty
 */
export const getByDifficulty = async (req: Request, res: Response) => {
  try {
    const { difficulty } = req.params;
    const { limit = '20' } = req.query;
    
    const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
    
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ 
        error: 'Invalid difficulty',
        validDifficulties 
      });
    }
    
    const resources = await SystemDesignResource.find({ difficulty })
      .sort({ score: -1 })
      .limit(parseInt(limit as string));
    
    res.json({
      difficulty,
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get single resource by ID
 * GET /api/system-design/:id
 */
export const getResourceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const resource = await SystemDesignResource.findById(id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({ resource });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get resource statistics
 * GET /api/system-design/stats
 */
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
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Search resources by topic or title
 * GET /api/system-design/search?q=caching
 */
export const searchResources = async (req: Request, res: Response) => {
  try {
    const { q, limit = '20' } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const resources = await SystemDesignResource.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { topics: { $in: [new RegExp(q, 'i')] } },
      ]
    })
      .sort({ score: -1 })
      .limit(parseInt(limit as string));
    
    res.json({
      query: q,
      count: resources.length,
      resources,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};