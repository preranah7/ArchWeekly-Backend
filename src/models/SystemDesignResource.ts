import mongoose, { Document } from 'mongoose';

export interface ISystemDesignResource extends Document {
  title: string;
  url: string;
  description: string;
  source: string;
  type: 'article' | 'video' | 'interactive' | 'diagram' | 'guide';
  
  // Categorization
  category: 'Fundamentals' | 'Intermediate' | 'Advanced' | 'Case Studies' | 'Interview Problems';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  
  // Scoring (from Gemini AI)
  score: number;
  reasoning: string;
  
  // Visual content
  diagrams?: Array<{
    url: string;
    description: string;
    source: string;
  }>;
  hasVisuals: boolean;
  thumbnail?: string;
  
  // Content metadata
  topics: string[];
  estimatedTime?: number; // Minutes
  keyLearnings?: string[];
  
  // Ranking
  rank?: number; // For featured/top resources
  
  // Timestamps
  scrapedAt: Date;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const systemDesignResourceSchema = new mongoose.Schema<ISystemDesignResource>(
  {
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['github', 'youtube', 'blog', 'interactive', 'documentation'],
    },
    type: {
      type: String,
      required: true,
      enum: ['article', 'video', 'interactive', 'diagram', 'guide'],
    },
    category: {
      type: String,
      required: true,
      enum: ['Fundamentals', 'Intermediate', 'Advanced', 'Case Studies', 'Interview Problems'],
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    reasoning: {
      type: String,
      required: true,
    },
    diagrams: [
      {
        url: String,
        description: String,
        source: String,
      },
    ],
    hasVisuals: {
      type: Boolean,
      default: false,
    },
    thumbnail: String,
    topics: [String],
    estimatedTime: Number,
    keyLearnings: [String],
    rank: Number,
    scrapedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
systemDesignResourceSchema.index({ score: -1 });
systemDesignResourceSchema.index({ category: 1 });
systemDesignResourceSchema.index({ difficulty: 1 });
systemDesignResourceSchema.index({ rank: 1 });
systemDesignResourceSchema.index({ scrapedAt: -1 });

export default mongoose.model<ISystemDesignResource>(
  'SystemDesignResource',
  systemDesignResourceSchema
);