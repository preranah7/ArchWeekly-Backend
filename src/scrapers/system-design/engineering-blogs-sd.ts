//src/scrapers/system-design/engineering-blogs-sd.ts
import axios from 'axios';
import { load } from 'cheerio';

interface BlogResource {
  title: string;
  url: string;
  description: string;
  source: string;
  type: 'article';
  topics: string[];
  hasVisuals: boolean;
  scrapedAt: string;
  publishedDate?: string;
}

const CONFIG = {
  REQUEST_TIMEOUT: 15000,
  MAX_POSTS_PER_FEED: 5,
  MAX_DESCRIPTION_LENGTH: 300,
} as const;

const TOPIC_MAP: Record<string, string> = {
  'microservices': 'Microservices',
  'kubernetes': 'Kubernetes',
  'scalability': 'Scalability',
  'distributed': 'Distributed Systems',
  'caching': 'Caching',
  'database': 'Databases',
  'architecture': 'Architecture',
  'performance': 'Performance',
  'reliability': 'Reliability',
  'observability': 'Observability',
  'api': 'API Design',
  'infrastructure': 'Infrastructure',
};

function extractTopics(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const found = new Set<string>();
  
  Object.entries(TOPIC_MAP).forEach(([keyword, topic]) => {
    if (text.includes(keyword)) found.add(topic);
  });

  return Array.from(found).slice(0, 5);
}

async function parseRSS(feedUrl: string, sourceName: string): Promise<BlogResource[]> {
  try {
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: CONFIG.REQUEST_TIMEOUT,
    });

    const xmlData = String(response.data);
    const $ = load(xmlData, { xmlMode: true });
    const posts: BlogResource[] = [];

    $('item').slice(0, CONFIG.MAX_POSTS_PER_FEED).each((_, element) => {
      const title = $(element).find('title').text().trim();
      const url = $(element).find('link').text().trim();
      const description = $(element).find('description').text().trim()
        .replace(/<[^>]*>/g, '')
        .substring(0, CONFIG.MAX_DESCRIPTION_LENGTH);
      const pubDate = $(element).find('pubDate').text().trim();

      if (title && url) {
        const topics = extractTopics(title, description);
        posts.push({
          title,
          url,
          description,
          source: sourceName,
          type: 'article',
          topics: topics.length > 0 ? topics : ['System Design'],
          hasVisuals: false,
          scrapedAt: new Date().toISOString(),
          publishedDate: pubDate,
        });
      }
    });

    return posts;
  } catch (error: any) {
    return [];
  }
}

async function scrapeNetflixBlog(): Promise<BlogResource[]> {
  return parseRSS('https://medium.com/feed/netflix-techblog', 'blog-netflix');
}

async function scrapeStripeBlog(): Promise<BlogResource[]> {
  return parseRSS('https://stripe.com/blog/feed.rss', 'blog-stripe');
}

async function scrapeAWSBlog(): Promise<BlogResource[]> {
  return parseRSS('https://aws.amazon.com/blogs/architecture/feed/', 'blog-aws');
}

async function scrapeLinkedInBlog(): Promise<BlogResource[]> {
  return parseRSS('https://engineering.linkedin.com/blog.rss', 'blog-linkedin');
}

export async function scrapeEngineeringBlogsSD(): Promise<BlogResource[]> {
  const results = await Promise.allSettled([
    scrapeNetflixBlog(),
    scrapeStripeBlog(),
    scrapeAWSBlog(),
    scrapeLinkedInBlog(),
  ]);

  const allPosts = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r as PromiseFulfilledResult<BlogResource[]>).value);

  return allPosts;
}

export { BlogResource };