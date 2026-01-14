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

async function runAllScrapers(): Promise<UnifiedArticle[]> {
  console.log('🚀 Starting ScaleWeekly scrapers...\n');
  console.log('📊 Scraping HIGH-QUALITY sources...\n');
  
  try {
    // Scrape all sources in parallel
    const [engBlogs, hnStories, redditPosts] = await Promise.all([
      scrapeEngineeringBlogs(),  // High Scalability, Pragmatic Engineer, Cloudflare, AWS
      scrapeHackerNews(),         // Community signal
      scrapeReddit()              // High-upvote DevOps posts
    ]);
    
    const allArticles: UnifiedArticle[] = [
      // Engineering blogs (PRIORITY - your main source)
      ...engBlogs.map(post => ({
        title: post.title,
        url: post.url,
        description: post.description,
        source: post.source,
        scraped_at: post.scraped_at
      })),
      
      // HackerNews (filtered for relevance)
      ...hnStories.map(story => ({
        title: story.title,
        url: story.url,
        description: story.title, // HN doesn't have descriptions
        source: story.source,
        scraped_at: story.scraped_at
      })),
      
      // Reddit (only high-quality discussions 100+ upvotes)
      ...redditPosts
        .filter(post => post.upvotes > 100)
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
    
    console.log(`\n✅ TOTAL ARTICLES FOUND: ${allArticles.length}`);
    console.log(`   📰 Engineering Blogs: ${engBlogs.length}`);
    console.log(`   🔥 HackerNews: ${hnStories.length}`);
    console.log(`   💬 Reddit (100+ upvotes): ${redditPosts.filter(p => p.upvotes > 100).length}\n`);
    
    return allArticles;
    
  } catch (error) {
    console.error('❌ Error in scrapers:', error);
    throw error;
  }
}

export { runAllScrapers, UnifiedArticle };
