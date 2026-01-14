//src/ai/system-design-scorer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

/**
 * Type-safe error message extractor
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}

/**
 * Utility: Split array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Utility: Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 2000 // Increased from 1000ms
): Promise<T> {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Check if it's a 503 overload error
      if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        console.log(`⚠️  Gemini API overloaded. Waiting longer before retry...`);
      }
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`⚠️  Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delayMs)}ms...`);
      console.log(`   Error: ${errorMessage}`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
  
  throw new Error('Retry failed');
}

/**
 * Clean and extract JSON from Gemini response
 */
function cleanAndExtractJSON(response: string): any {
  // Remove markdown code blocks
  let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  cleaned = cleaned.trim();
  
  // Extract JSON array
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in response');
  }
  
  // Parse JSON
  return JSON.parse(jsonMatch[0]);
}

/**
 * Score a single batch of resources
 */
async function scoreBatch(
  batch: any[],
  batchOffset: number
): Promise<ScoredSystemDesignResource[]> {
  // Configure model with JSON response
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
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
    
    // Clean and parse JSON
    const scores = cleanAndExtractJSON(responseText);
    
    // Validate structure
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new Error('Invalid scores format: expected non-empty array');
    }
    
    // Merge scores with original resources
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
  }, 3, 2000); // 3 retries, 2 second base delay
}

/**
 * Score System Design resources using Gemini AI
 * Optimized for 300-350 resources with better rate limiting
 */
export async function scoreSystemDesignResources(
  resources: any[]
): Promise<ScoredSystemDesignResource[]> {
  console.log('\n🤖 Analyzing System Design resources with Gemini AI...\n');
  
  const BATCH_SIZE = 20; // Reduced from 15 to avoid overload
  const DELAY_BETWEEN_BATCHES = 15000; // 2 second delay between batches
  
  const batches = chunkArray(resources, BATCH_SIZE);
  const allScoredResources: ScoredSystemDesignResource[] = [];
  
  console.log(`📦 Processing ${resources.length} resources in ${batches.length} batches (${BATCH_SIZE} per batch)...\n`);
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchOffset = i * BATCH_SIZE;
    
    console.log(`⚙️  Batch ${i + 1}/${batches.length}: Scoring ${batch.length} resources...`);
    
    try {
      const scoredBatch = await scoreBatch(batch, batchOffset);
      allScoredResources.push(...scoredBatch);
      
      console.log(`✅ Batch ${i + 1} completed: ${scoredBatch.length} resources scored`);
      console.log(`   Progress: ${allScoredResources.length}/${resources.length} (${Math.round(allScoredResources.length / resources.length * 100)}%)\n`);
      
      // Rate limiting: wait between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
      
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      console.error(`❌ Batch ${i + 1} failed after retries:`, errorMessage);
      
      // Add fallback scores for failed batch
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
      console.log(`⚠️  Added ${fallbackScores.length} resources with fallback scores\n`);
    }
  }
  
  // Sort by score (highest first)
  allScoredResources.sort((a, b) => b.score - a.score);
  
  console.log(`\n✅ Successfully scored ${allScoredResources.length}/${resources.length} resources!\n`);
  
  // Log top 5 scores
  console.log('🏆 Top 5 System Design Resources:');
  allScoredResources.slice(0, 5).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.title} (Score: ${r.score}/10) [${r.type.toUpperCase()}]`);
    console.log(`Category: ${r.category} | Difficulty: ${r.difficulty}`);
    console.log(`${r.reasoning}\n`);
  });
  
  return allScoredResources;
}