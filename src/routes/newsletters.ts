//src/routes/newsletter.ts
import express from 'express';
import {
  getLatest,
  getArchive,
  getById,
  getByCategory,
  getTopRanked,
} from '../controllers/newsletterController';
import {
  broadcastNewsletter,
  sendTestEmail,
  triggerNewsletter,
} from '../controllers/newsletterSenderController';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/latest', getLatest);
router.get('/top', getTopRanked);
router.get('/category/:category', getByCategory);
router.get('/', getArchive);
router.get('/:id', getById);

// Admin routes
router.post('/send', authMiddleware, adminOnly, broadcastNewsletter);
router.post('/test', authMiddleware, adminOnly, sendTestEmail);
router.post('/trigger', authMiddleware, adminOnly, triggerNewsletter);

export default router;