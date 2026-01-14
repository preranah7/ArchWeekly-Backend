//src/routes/subscribers.ts
import express from 'express';
import {
  subscribe,
  unsubscribe,
  getAllSubscribers,
  getStats,
  getSubscriberCount,
  getReferralStats,
} from '../controllers/subscriberController';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/subscribe', subscribe);
router.delete('/unsubscribe/:email', unsubscribe);
router.get('/stats', getStats);
router.get('/count', getSubscriberCount);
router.get('/referrals/:email', getReferralStats);

// Admin routes
router.get('/', authMiddleware, adminOnly, getAllSubscribers);

export default router;