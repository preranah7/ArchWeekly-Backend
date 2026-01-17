//src/scrapers/index.ts
import { scrapeHackerNews, Story } from './hackernews';
import { scrapeReddit, RedditPost } from './reddit';
import { scrapeEngineeringBlogs, BlogPost } from './engineering-blogs';

interface UnifiedArticle {
  title: string;
  url: string;
  description?: string;
  source: string;
  scraped_at: string;
  tags?: string[];
  upvotes?: number;
  comments?: number;
}

const CONFIG = {
  REDDIT_MIN_UPVOTES: 100,
} as const;

async function runAllScrapers(): Promise<UnifiedArticle[]> {
  try {
    const [engBlogs, hnStories, redditPosts] = await Promise.all([
      scrapeEngineeringBlogs(),
      scrapeHackerNews(),
      scrapeReddit()
    ]);
    
    const allArticles: UnifiedArticle[] = [
      ...engBlogs.map(post => ({
        title: post.title,
        url: post.url,
        description: post.description,
        source: post.source,
        scraped_at: post.scraped_at
      })),
      
      ...hnStories.map(story => ({
        title: story.title,
        url: story.url,
        description: story.title,
        source: story.source,
        scraped_at: story.scraped_at
      })),
      
      ...redditPosts
        .filter(post => post.upvotes > CONFIG.REDDIT_MIN_UPVOTES)
        .map(post => ({
          title: post.title,
          url: post.url,
          description: post.description,
          source: post.source,
          scraped_at: post.scraped_at,
          upvotes: post.upvotes,
          comments: post.comments
        }))
    ];
    
    return allArticles;
  } catch (error) {
    throw error;
  }
}

export { runAllScrapers, UnifiedArticle };