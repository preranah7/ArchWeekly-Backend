//src/controllers/authController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import User from '../models/User';

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (email: string, role = 'user') => {
  return jwt.sign(
    { email, role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email });
    }

    const otp = generateOTP();

    console.log('\n' + '='.repeat(50));
    console.log(`🔑 OTP for ${email}: ${otp}`);
    console.log('='.repeat(50) + '\n');

    // IMPORTANT: Send email FIRST, before saving to DB
    // This way if email fails, we don't save the OTP
    try {
      const emailResponse = await getResend().emails.send({
        // ✅ Use verified sender domain or onboarding@resend.dev
        from: 'ScaleWeekly <onboarding@resend.dev>',
        to: email,
        subject: 'Your ScaleWeekly Login OTP',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0;">Welcome to ScaleWeekly</h2>
            <p style="color: #6b7280; margin: 0 0 24px 0;">Your one-time password is:</p>
            
            <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0ea5e9; font-family: 'Courier New', monospace; font-size: 36px; letter-spacing: 6px; margin: 0;">
                ${otp}
              </h1>
            </div>
            
            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
              ⏱️ This OTP expires in 10 minutes.
            </p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });

      if (!emailResponse.data?.id) {
        console.error('❌ Email send failed - no ID returned:', emailResponse);
        return res.status(500).json({ 
          error: 'Failed to send OTP email. Please try again.' 
        });
      }

      console.log(`✅ Email sent successfully to ${email}`);
      console.log(`📧 Email ID: ${emailResponse.data.id}\n`);

    } catch (emailError) {
      const err = emailError as any;
      console.error('❌ Resend API Error:', {
        message: err.message,
        status: err.status,
        data: err.data,
      });
      
      return res.status(500).json({ 
        error: `Email service error: ${err.message || 'Unknown error'}. Check backend logs.`,
        emailError: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }

    // ✅ Save OTP to DB ONLY after email is successfully sent
    user.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    await user.save();

    // ✅ Return success response
    res.json({
      message: 'OTP sent successfully to your email',
      email,
      expiresIn: '10 minutes',
      ...(process.env.NODE_ENV === 'development' && { 
        otp,  // Only in dev mode for testing
        note: 'Check your email for the OTP'
      }),
    });

  } catch (error) {
    console.error('❌ Unexpected error in sendOTP:', error);
    res.status(500).json({ 
      error: (error as Error).message,
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
    res.status(500).json({ error: (error as Error).message });
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
    res.status(500).json({ error: (error as Error).message });
  }
};
