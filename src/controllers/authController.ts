//src/controllers/authController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import User from '../models/User';

const CONFIG = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  JWT_EXPIRY: '7d',
  EMAIL_FROM: process.env.EMAIL_FROM || 'ArchWeekly <newsletter@archweekly.online>',
} as const;

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

const generateOTP = (): string => {
  const min = Math.pow(10, CONFIG.OTP_LENGTH - 1);
  const max = Math.pow(10, CONFIG.OTP_LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

const generateToken = (email: string, role = 'user'): string => {
  return jwt.sign(
    { email, role },
    process.env.JWT_SECRET!,
    { expiresIn: CONFIG.JWT_EXPIRY }
  );
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email });
    }

    const otp = generateOTP();

    try {
      const emailResponse = await getResend().emails.send({
        from: CONFIG.EMAIL_FROM,
        to: email,
        subject: 'Your ArchWeekly Login OTP',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0;">Welcome to ArchWeekly</h2>
            <p style="color: #6b7280; margin: 0 0 24px 0;">Your one-time password is:</p>
            
            <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: #EA580C; font-family: 'Courier New', monospace; font-size: 36px; letter-spacing: 6px; margin: 0;">
                ${otp}
              </h1>
            </div>
            
            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
              This OTP expires in ${CONFIG.OTP_EXPIRY_MINUTES} minutes.
            </p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });

      if (!emailResponse.data?.id) {
        throw new Error('Email service did not return confirmation');
      }

    } catch (emailError) {
      const err = emailError as any;
      return res.status(500).json({ 
        error: 'Failed to send OTP email. Please try again.',
      });
    }

    user.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000),
    };

    await user.save();

    res.json({
      message: 'OTP sent successfully to your email',
      email,
      expiresIn: `${CONFIG.OTP_EXPIRY_MINUTES} minutes`,
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Request OTP first.' });
    }

    if (!user.otp) {
      return res.status(400).json({ error: 'No OTP found. Request a new one.' });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (user.otp.expiresAt! < new Date()) {
      user.otp = undefined;
      await user.save();
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }

    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    const token = generateToken(user.email, user.role);

    res.json({
      message: 'Successfully verified',
      token,
      user: {
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during verification' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ email: (req as any).user.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching user data' });
  }
};