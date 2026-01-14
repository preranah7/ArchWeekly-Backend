//src/ai/system-design-scorer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Configuration constants
const CONFIG = {
  BATCH_SIZE: parseInt(process.env.SCORING_BATCH_SIZE || '20'),
  BATCH_DELAY_MS: parseInt(process.env.SCORING_BATCH_DELAY || '15000'),
  RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 2000,
  MODEL_NAME: 'gemini-2.5-flash',
  MODEL_TEMPERATURE: 0.7,
} as const;

export interface ScoredSystemDesignResource {
  title: string;
  url: string;
  description: string;
  source: string;
  type: string;
  topics: string[];
  diagrams?: any[];
  hasVisuals: boolean;
  thumbnail?: string;
  estimatedTime?: number;
  score: number;
  reasoning: string;
  category: string;
  difficulty: string;
  keyLearnings: string[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = CONFIG.RETRY_ATTEMPTS,
  baseDelayMs: number = CONFIG.RETRY_BASE_DELAY_MS
): Promise<T> {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
  
  throw new Error('Retry failed');
}

function cleanAndExtractJSON(response: string): any {
  let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function scoreBatch(
  batch: any[],
  batchOffset: number
): Promise<ScoredSystemDesignResource[]> {
  const model = genAI.getGenerativeModel({
    model: CONFIG.MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: CONFIG.MODEL_TEMPERATURE,
    },
  });

  const prompt = `You are an expert curator for "ScaleWeekly System Design" - a section focused on helping engineers master system design, scalability, and distributed systems.

Analyze these ${batch.length} System Design resources (GitHub repos, YouTube videos, and engineering blogs) and score each from 1-10 based on:

**For GitHub Repos & Articles:**
- Educational value and clarity (40%) - How well does it teach the concept?
- Visual quality and diagrams (20%) - Are there helpful diagrams and illustrations?
- Completeness and depth (20%) - Does it cover the topic thoroughly?
- Practical applicability (20%) - Can engineers apply this knowledge in real projects?

**For YouTube Videos:**
- Content quality and clarity (40%) - Is the explanation clear and well-structured?
- Visual explanations (25%) - Does it use diagrams, animations, or demos effectively?
- Engagement and pacing (15%) - Is it engaging and well-paced?
- Practical examples (20%) - Does it include real-world examples or code?

**For Engineering Blogs:**
- Technical depth and insights (40%) - Does it share deep technical knowledge?
- Real-world production experience (30%) - Is it from actual production systems?
- Actionable takeaways (20%) - Can readers apply these learnings?
- Novelty and uniqueness (10%) - Does it share new perspectives?

Resources:
${batch.map((r, i) => `${i}. ${r.title} [${r.type.toUpperCase()}]
   Source: ${r.source}
   ${r.description.substring(0, 200)}
   Topics: ${r.topics.join(', ')}
   ${r.type === 'video' ? `Duration: ${r.estimatedTime || 'Unknown'} min` : ''}
   Has Visuals: ${r.hasVisuals ? 'Yes' : 'No'}`).join('\n\n')}

Return ONLY a valid JSON array (no markdown, no code blocks, no extra text):
[
  {
    "index": 0,
    "score": 9,
    "reasoning": "Excellent visual explanation of distributed consensus with real-world examples",
    "category": "Advanced",
    "difficulty": "Intermediate",
    "keyLearnings": ["Raft consensus", "Leader election", "Production tradeoffs"],
    "estimatedTime": 15
  }
]

**Categories** (choose ONE):
- Fundamentals: Core concepts (CAP, scalability, performance)
- Intermediate: Specific tech (load balancers, caching, databases)
- Advanced: Complex topics (consensus, sharding, multi-region)
- Case Studies: Real-world designs (Netflix, Uber, Twitter)
- Interview Problems: Practice problems and solutions

**Difficulty** (choose ONE):
- Beginner, Intermediate, or Advanced

**estimatedTime**: 
- Videos: Use actual duration
- Articles: 10-30 min based on depth

**keyLearnings**: 2-4 key takeaways

Respond with ONLY the JSON array.`;

  return retryWithBackoff(async () => {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const scores = cleanAndExtractJSON(responseText);
    
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new Error('Invalid scores format: expected non-empty array');
    }
    
    const scoredResources: ScoredSystemDesignResource[] = scores
      .filter((s: any) => s.index >= 0 && s.index < batch.length)
      .map((s: any) => ({
        ...batch[s.index],
        score: s.score,
        reasoning: s.reasoning,
        category: s.category,
        difficulty: s.difficulty,
        keyLearnings: s.keyLearnings || [],
        estimatedTime: s.estimatedTime || batch[s.index].estimatedTime || 10,
      }));
    
    return scoredResources;
  });
}

export async function scoreSystemDesignResources(
  resources: any[]
): Promise<ScoredSystemDesignResource[]> {
  const batches = chunkArray(resources, CONFIG.BATCH_SIZE);
  const allScoredResources: ScoredSystemDesignResource[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchOffset = i * CONFIG.BATCH_SIZE;
    
    try {
      const scoredBatch = await scoreBatch(batch, batchOffset);
      allScoredResources.push(...scoredBatch);
      
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY_MS));
      }
      
    } catch (error) {
      const fallbackScores: ScoredSystemDesignResource[] = batch.map(resource => ({
        ...resource,
        score: 5,
        reasoning: 'Failed to score - using default',
        category: 'Intermediate',
        difficulty: 'Intermediate',
        keyLearnings: [],
        estimatedTime: resource.estimatedTime || 10,
      }));
      
      allScoredResources.push(...fallbackScores);
    }
  }
  
  allScoredResources.sort((a, b) => b.score - a.score);
  
  return allScoredResources;
}