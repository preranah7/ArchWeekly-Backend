import mongoose, { Document } from 'mongoose';

export interface INewsletterArticle {
  title: string;
  url: string;
  source: string;
  description?: string;
  category?: string;
  score?: number;
  rank?: number;
  reasoning?: string;
  keyInsights?: string[];
}

export interface INewsletter extends Document {
  title: string;
  date: Date;
  articles: INewsletterArticle[];
  sentTo?: number; // Track how many subscribers received it
  sentAt?: Date;   // When was it sent
  status: 'draft' | 'sent'; // Newsletter status
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new mongoose.Schema<INewsletter>(
  {
    title: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    articles: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        source: { type: String, required: true },
        description: String,
        category: String,
        score: Number,
        rank: Number,
        reasoning: String,
        keyInsights: [String],
      },
    ],
    sentTo: {
      type: Number,
      default: 0,
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['draft', 'sent'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

// Indexes for querying
newsletterSchema.index({ date: -1 });
newsletterSchema.index({ status: 1 });

export default mongoose.model<INewsletter>('Newsletter', newsletterSchema);
