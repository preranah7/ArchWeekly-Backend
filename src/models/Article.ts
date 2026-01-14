import mongoose, { Document } from 'mongoose';

export interface IArticle extends Document {
  title: string;
  url: string;
  source: string;
  description?: string;
  score?: number;
  category?: string;
  reasoning?: string;
  keyInsights?: string[];
  upvotes?: number;
  comments?: number;
  rank?: number;
  scrapedAt: Date;
  createdAt: Date;      // ← ADD THIS
  updatedAt: Date;      // ← ADD THIS
}

const articleSchema = new mongoose.Schema<IArticle>(
  {
    title: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    source: { type: String, required: true },
    description: String,
    score: Number,
    category: String,
    reasoning: String,
    keyInsights: [String],
    upvotes: Number,
    comments: Number,
    rank: Number,
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }  // This adds createdAt and updatedAt automatically
);

// Index for faster queries
articleSchema.index({ score: -1 });
articleSchema.index({ scrapedAt: -1 });
articleSchema.index({ source: 1 });

export default mongoose.model<IArticle>('Article', articleSchema);
