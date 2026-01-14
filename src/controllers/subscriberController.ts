//src/controllers/subscriberController.ts
import { Request, Response } from 'express';
import Subscriber from '../models/Subscriber';
import User from '../models/User';

const CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  REFERRAL_CODE_LENGTH: 6,
} as const;

const generateReferralCode = (email: string): string => {
  const prefix = email.split('@')[0].toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 2 + CONFIG.REFERRAL_CODE_LENGTH).toUpperCase();
  return `${prefix}_${suffix}`;
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const subscribe = async (req: Request, res: Response) => {
  try {
    const { email, referredBy } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await Subscriber.findOne({ email });
    if (existing && existing.isActive) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    let subscriber;
    if (existing) {
      subscriber = existing;
      subscriber.isActive = true;
      subscriber.unsubscribedAt = null;
      subscriber.referredBy = referredBy || existing.referredBy;
    } else {
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
    res.status(500).json({ error: 'An error occurred during subscription' });
  }
};

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
    res.status(500).json({ error: 'An error occurred during unsubscription' });
  }
};

export const getAllSubscribers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(
      CONFIG.MAX_PAGE_SIZE,
      parseInt((req.query.limit as string) || String(CONFIG.DEFAULT_PAGE_SIZE), 10)
    );
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
    res.status(500).json({ error: 'An error occurred while fetching subscribers' });
  }
};

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
    res.status(500).json({ error: 'An error occurred while fetching statistics' });
  }
};

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
      totalUnique: activeSubscribers + verifiedUsers,
      breakdown: {
        subscribersOnly: activeSubscribers,
        verifiedUsersOnly: verifiedUsers,
        combined: activeSubscribers + verifiedUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching counts' });
  }
};

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
    res.status(500).json({ error: 'An error occurred while fetching referral stats' });
  }
};