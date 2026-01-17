//src/scrapers/engineering-blogs.ts
import axios from 'axios';
import { load } from 'cheerio';

interface BlogPost {
  title: string;
  url: string;
  description: string;
  source: string;
  scraped_at: string;
  published_date?: string;
}

const CONFIG = {
  REQUEST_TIMEOUT: 10000,
  MAX_POSTS_PER_FEED: 5,
  MAX_DESCRIPTION_LENGTH: 300,
} as const;

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
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: CONFIG.REQUEST_TIMEOUT,
    });
    
    const xmlData = String(response.data);
    const $ = load(xmlData, { xmlMode: true });
    const posts: BlogPost[] = [];
    
    $('item').slice(0, CONFIG.MAX_POSTS_PER_FEED).each((index, element) => {
      const title = $(element).find('title').text().trim();
      const url = $(element).find('link').text().trim();
      const description = $(element).find('description').text().trim()
        .replace(/<[^>]*>/g, '')
        .substring(0, CONFIG.MAX_DESCRIPTION_LENGTH);
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
    return [];
  }
}

async function scrapeEngineeringBlogs(): Promise<BlogPost[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(feed => parseRSS(feed.url, feed.source))
  );
  
  const allPosts = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => (result as PromiseFulfilledResult<BlogPost[]>).value);
  
  return allPosts;
}

export { scrapeEngineeringBlogs, BlogPost };