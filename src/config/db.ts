//src/config/db.ts
import mongoose from 'mongoose';

const CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
} as const;

async function connectWithRetry(attempt: number = 1): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
    });
    return conn;
  } catch (error) {
    if (attempt >= CONFIG.RETRY_ATTEMPTS) {
      throw new Error(`MongoDB connection failed after ${CONFIG.RETRY_ATTEMPTS} attempts`);
    }
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
    return connectWithRetry(attempt + 1);
  }
}

export const connectDB = async () => {
  try {
    const conn = await connectWithRetry();
    return conn;
  } catch (error) {
    throw error;
  }
};