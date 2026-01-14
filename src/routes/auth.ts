import express from 'express';
import {
  sendOTP,
  verifyOTP,
  getMe,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected routes
router.get('/me', authMiddleware, getMe);

// Optional: Logout route (client-side just removes token, but useful for tracking)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
