//src/routes/auth.ts
import express from 'express';
import {
  sendOTP,
  verifyOTP,
  getMe,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;