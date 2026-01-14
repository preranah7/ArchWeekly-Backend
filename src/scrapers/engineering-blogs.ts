import axios from 'axios';
import { load } from 'cheerio';
import https from 'https';

interface BlogPost {
  title: string;
  url: string;
  description: string;
  source: string;
  scraped_at: string;
  published_date?: string;
}

// High-quality engineering blog RSS feeds

const RSS_FEEDS = [
  {
    name: 'High Scalability',
    url: 'http://feeds.feedburner.com/HighScalability',
    source: 'highscalability'
  },
  {
    name: 'The Pragmatic Engineer',
    url: 'https://blog.pragmaticengineer.com/rss/',
    source: 'pragmatic'
  },
  {
    name: 'Cloudflare Blog',
    url: 'https://blog.cloudflare.com/rss/',
    source: 'cloudflare'
  },
  {
    name: 'AWS Compute Blog',
    url: 'https://aws.amazon.com/blogs/compute/feed/',
    source: 'aws'
  }
];



async function parseRSS(feedUrl: string, sourceName: string): Promise<BlogPost[]> {
  try {
    // Create HTTPS agent that ignores SSL errors (for development)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      httpsAgent
    } as any); // Use 'as any' to bypass TypeScript strictness
    
    const xmlData = String(response.data);
    const $ = load(xmlData, { xmlMode: true });
    const posts: BlogPost[] = [];
    
    // Parse RSS items (limit to 5 latest)
    $('item').slice(0, 5).each((index, element) => {
      const title = $(element).find('title').text().trim();
      const url = $(element).find('link').text().trim();
      const description = $(element).find('description').text().trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .substring(0, 300);
      const pubDate = $(element).find('pubDate').text().trim();
      
      if (title && url) {
        posts.push({
          title,
          url,
          description,
          source: sourceName,
          scraped_at: new Date().toISOString(),
          published_date: pubDate
        });
      }
    });
    
    return posts;
    
  } catch (error: any) {
    console.error(`❌ Error fetching ${feedUrl}:`, error.message);
    return [];
  }
}

async function scrapeEngineeringBlogs(): Promise<BlogPost[]> {
  console.log('📰 Fetching engineering blog RSS feeds...\n');
  
  const results = await Promise.allSettled(
    RSS_FEEDS.map(feed => {
      console.log(`📡 Fetching ${feed.name}...`);
      return parseRSS(feed.url, feed.source);
    })
  );
  
  const allPosts = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => (result as PromiseFulfilledResult<BlogPost[]>).value);
  
  allPosts.forEach(post => {
    console.log(`✅ ${post.source}: ${post.title}`);
  });
  
  console.log(`\n✅ Found ${allPosts.length} engineering blog posts\n`);
  return allPosts;
}

export { scrapeEngineeringBlogs, BlogPost };
