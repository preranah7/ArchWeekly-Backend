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

/**
 * Extract topics from title and description
 */
function extractTopics(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const topicMap: Record<string, string> = {
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

  const found = new Set<string>();
  Object.entries(topicMap).forEach(([keyword, topic]) => {
    if (text.includes(keyword)) found.add(topic);
  });

  return Array.from(found).slice(0, 5);
}

/**
 * Parse RSS feed
 */
async function parseRSS(feedUrl: string, sourceName: string): Promise<BlogResource[]> {
  try {
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
    });

    const xmlData = String(response.data);
    const $ = load(xmlData, { xmlMode: true });
    const posts: BlogResource[] = [];

    $('item').slice(0, 5).each((_, element) => {
      const title = $(element).find('title').text().trim();
      const url = $(element).find('link').text().trim();
      const description = $(element).find('description').text().trim()
        .replace(/<[^>]*>/g, '')
        .substring(0, 300);
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
          hasVisuals: false, // Assume no diagrams unless verified
          scrapedAt: new Date().toISOString(),
          publishedDate: pubDate,
        });
      }
    });

    return posts;
  } catch (error: any) {
    console.error(`❌ Error fetching ${feedUrl}:`, error.message);
    return [];
  }
}

/**
 * Scrape Netflix Tech Blog
 */
async function scrapeNetflixBlog(): Promise<BlogResource[]> {
  console.log('📰 Fetching Netflix Tech Blog...');
  return parseRSS('https://medium.com/feed/netflix-techblog', 'blog-netflix');
}

/**
 * Scrape Stripe Engineering Blog
 */
async function scrapeStripeBlog(): Promise<BlogResource[]> {
  console.log('📰 Fetching Stripe Engineering Blog...');
  return parseRSS('https://stripe.com/blog/feed.rss', 'blog-stripe');
}

/**
 * Scrape AWS Architecture Blog
 */
async function scrapeAWSBlog(): Promise<BlogResource[]> {
  console.log('📰 Fetching AWS Architecture Blog...');
  return parseRSS('https://aws.amazon.com/blogs/architecture/feed/', 'blog-aws');
}

/**
 * Scrape LinkedIn Engineering Blog
 */
async function scrapeLinkedInBlog(): Promise<BlogResource[]> {
  console.log('📰 Fetching LinkedIn Engineering Blog...');
  return parseRSS('https://engineering.linkedin.com/blog.rss', 'blog-linkedin');
}

/**
 * Main function to scrape all engineering blogs
 */
export async function scrapeEngineeringBlogsSD(): Promise<BlogResource[]> {
  console.log('\n📚 SCRAPING ENGINEERING BLOGS...\n');

  const results = await Promise.allSettled([
    scrapeNetflixBlog(),
    scrapeStripeBlog(),
    scrapeAWSBlog(),
    scrapeLinkedInBlog(),
  ]);

  const allPosts = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r as PromiseFulfilledResult<BlogResource[]>).value);

  console.log(`\n✅ TOTAL BLOG ARTICLES SCRAPED: ${allPosts.length}`);
  allPosts.forEach(post => {
    console.log(`   ✅ ${post.source}: ${post.title}`);
  });
  console.log();

  return allPosts;
}

export { BlogResource };