import mongoose, { Document } from 'mongoose';

interface IOTPData {
  code?: string;
  expiresAt?: Date;
}

export interface IUser extends Document {
  email: string;
  otp?: IOTPData;
  isVerified: boolean;
  role: 'user' | 'admin';
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email',
      ],
    },
    otp: {
      code: String,
      expiresAt: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.index({ 'otp.expiresAt': 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IUser>('User', userSchema);
