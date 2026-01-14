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

// ===== PUBLIC ROUTES - Newsletter Content =====
router.get('/latest', getLatest);                        // Get latest newsletter
router.get('/top', getTopRanked);                        // Get top articles
router.get('/category/:category', getByCategory);        // Articles by category
router.get('/', getArchive);                             // Newsletter archive
router.get('/:id', getById);                             // Get specific newsletter by ID

// ===== ADMIN ROUTES - Newsletter Operations =====
router.post('/send', authMiddleware, adminOnly, broadcastNewsletter);     // Send to all subscribers
router.post('/test', authMiddleware, adminOnly, sendTestEmail);           // Send test email
router.post('/trigger', authMiddleware, adminOnly, triggerNewsletter);    // Trigger complete workflow

export default router;
