//src/ai/gemini-scorer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CONFIG = {
  MODEL_NAME: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
} as const;

export interface ScoredArticle {
  title: string;
  url: string;
  description: string;
  source: string;
  score: number;
  reasoning: string;
  category: string;
  keyInsights: string[];
  upvotes?: number;
  comments?: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = CONFIG.RETRY_ATTEMPTS
): Promise<T> {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delayMs = CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
  
  throw new Error('Retry failed');
}

export async function scoreArticles(articles: any[]): Promise<ScoredArticle[]> {
  const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
  
  const prompt = `You are an expert curator for "ScaleWeekly" - a newsletter focused on system design, scalability, DevOps, and site reliability engineering.

Analyze these ${articles.length} articles and score each from 1-10 based on:
- Relevance to system design/scalability/DevOps (40%)
- Technical depth and actionable insights (30%)
- Real-world production experience (20%)
- Novelty and uniqueness (10%)

Articles:
${articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})
   ${a.description || 'No description'}
   URL: ${a.url}`).join('\n\n')}

Return ONLY a valid JSON array (no markdown, no code blocks, no extra text):
[
  {
    "index": 0,
    "score": 9,
    "reasoning": "Excellent deep-dive into Netflix's production reliability patterns",
    "category": "System Design",
    "keyInsights": ["Temporal workflow patterns", "Failure recovery at scale"]
  }
]

Categories must be one of: System Design, DevOps, Scalability, Cloud Architecture, Observability, Performance, Security, Database`;

  return retryWithBackoff(async () => {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const scores = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new Error('Invalid scores format');
    }
    
    const scoredArticles: ScoredArticle[] = scores
      .filter((s: any) => s.index >= 0 && s.index < articles.length)
      .map((s: any) => ({
        ...articles[s.index],
        score: s.score,
        reasoning: s.reasoning,
        category: s.category,
        keyInsights: s.keyInsights || []
      }));
    
    scoredArticles.sort((a, b) => b.score - a.score);
    
    return scoredArticles;
  });
}