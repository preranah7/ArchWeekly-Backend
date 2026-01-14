//src/routes/system-design.ts
import express from 'express';
import {
  getAllResources,
  getFeaturedResources,
  getByCategory,
  getByDifficulty,
  getResourceById,
  getStats,
  searchResources,
} from '../controllers/systemDesignController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// ===== PROTECTED ROUTES (Require authentication) =====
// All System Design routes now require login

router.get('/', authMiddleware, getAllResources);
router.get('/featured', authMiddleware, getFeaturedResources);
router.get('/search', authMiddleware, searchResources);
router.get('/stats', authMiddleware, getStats);
router.get('/category/:category', authMiddleware, getByCategory);
router.get('/difficulty/:difficulty', authMiddleware, getByDifficulty);
router.get('/:id', authMiddleware, getResourceById);

export default router;