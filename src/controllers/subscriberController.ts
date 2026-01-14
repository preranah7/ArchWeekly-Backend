import { Request, Response } from 'express';
import Subscriber from '../models/Subscriber';
import User from '../models/User';

const generateReferralCode = (email: string) => {
  return (
    email.split('@')[0].toUpperCase() +
    '_' +
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
};

/**
 * Subscribe a new user (Public - Homepage)
 * POST /api/subscribers/subscribe
 */
export const subscribe = async (req: Request, res: Response) => {
  try {
    const { email, referredBy } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await Subscriber.findOne({ email });
    if (existing && existing.isActive) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    let subscriber;
    if (existing) {
      // Reactivate existing subscriber
      subscriber = existing;
      subscriber.isActive = true;
      subscriber.unsubscribedAt = null;
      subscriber.referredBy = referredBy || existing.referredBy;
    } else {
      // Create new subscriber
      subscriber = new Subscriber({
        email,
        referralCode: generateReferralCode(email),
        referredBy: referredBy || null,
      });
    }

    await subscriber.save();

    res.status(201).json({
      message: 'Successfully subscribed',
      subscriber: {
        email: subscriber.email,
        referralCode: subscriber.referralCode,
        subscribedAt: subscriber.subscribedAt,
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unsubscribe a user (Public)
 * DELETE /api/subscribers/unsubscribe/:email
 */
export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    if (!subscriber.isActive) {
      return res.status(400).json({ 
        error: 'Already unsubscribed',
        message: 'This email is already unsubscribed.'
      });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json({
      message: 'Successfully unsubscribed',
      email: subscriber.email,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get all subscribers (Admin only - Use with adminOnly middleware)
 * GET /api/subscribers
 */
export const getAllSubscribers = async (req: Request, res: Response) => {
  try {
    // No need to check admin here - adminOnly middleware does it
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const skip = (page - 1) * limit;

    const subscribers = await Subscriber.find()
      .skip(skip)
      .limit(limit)
      .sort({ subscribedAt: -1 })
      .select('email isActive subscribedAt referralCode referredBy unsubscribedAt');

    const total = await Subscriber.countDocuments();
    const active = await Subscriber.countDocuments({ isActive: true });
    const inactive = await Subscriber.countDocuments({ isActive: false });

    res.json({
      subscribers,
      summary: {
        total,
        active,
        inactive,
      },
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
 * Get subscriber statistics (Public)
 * GET /api/subscribers/stats
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const total = await Subscriber.countDocuments();
    const active = await Subscriber.countDocuments({ isActive: true });
    const inactive = await Subscriber.countDocuments({ isActive: false });

    res.json({
      total,
      active,
      inactive,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get combined subscriber count (Subscribers + Verified Users)
 * GET /api/subscribers/count
 */
export const getSubscriberCount = async (req: Request, res: Response) => {
  try {
    const activeSubscribers = await Subscriber.countDocuments({ isActive: true });
    const totalSubscribers = await Subscriber.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const inactiveSubscribers = await Subscriber.countDocuments({ isActive: false });

    res.json({
      activeSubscribers,
      totalSubscribers,
      verifiedUsers,
      inactiveSubscribers,
      totalUnique: activeSubscribers + verifiedUsers, // Total people receiving newsletters
      breakdown: {
        subscribersOnly: activeSubscribers,
        verifiedUsersOnly: verifiedUsers,
        combined: activeSubscribers + verifiedUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get referral stats for a user (Public)
 * GET /api/subscribers/referrals/:email
 */
export const getReferralStats = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const subscriber = await Subscriber.findOne({ email });
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const referredSubscribers = await Subscriber.find({
      referredBy: subscriber.referralCode,
      isActive: true,
    }).select('email subscribedAt');

    const referralCount = referredSubscribers.length;

    res.json({
      email: subscriber.email,
      referralCode: subscriber.referralCode,
      totalReferrals: referralCount,
      referrals: referredSubscribers,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
