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

// ===== PUBLIC ROUTES =====
router.post('/subscribe', subscribe);                    // Homepage subscription
router.delete('/unsubscribe/:email', unsubscribe);       // Unsubscribe link
router.get('/stats', getStats);                          // Basic stats
router.get('/count', getSubscriberCount);                // Detailed count
router.get('/referrals/:email', getReferralStats);       // Referral stats

// ===== ADMIN ROUTES =====
router.get('/', authMiddleware, adminOnly, getAllSubscribers);  // List all subscribers (Admin only)

export default router;
