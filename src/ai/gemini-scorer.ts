//src/ai/gemini-scorer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

export async function scoreArticles(articles: any[]): Promise<ScoredArticle[]> {
  console.log('\n🤖 Analyzing articles with Gemini 2.5 Flash...\n');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
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

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Response:', response);
      throw new Error('No valid JSON found in Gemini response');
    }
    
    const scores = JSON.parse(jsonMatch[0]);
    
    // Validate scores
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new Error('Invalid scores format');
    }
    
    // Merge scores with original articles
    const scoredArticles: ScoredArticle[] = scores
      .filter((s: any) => s.index >= 0 && s.index < articles.length)
      .map((s: any) => ({
        ...articles[s.index],
        score: s.score,
        reasoning: s.reasoning,
        category: s.category,
        keyInsights: s.keyInsights || []
      }));
    
    // Sort by score (highest first)
    scoredArticles.sort((a, b) => b.score - a.score);
    
    console.log(`✅ Scored ${scoredArticles.length} articles successfully!\n`);
    
    return scoredArticles;
    
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    throw error;
  }
}
