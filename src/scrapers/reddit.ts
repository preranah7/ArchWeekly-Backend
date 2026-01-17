//src/scrapers/reddit.ts
import axios from 'axios';

interface RedditPost {
  title: string;
  url: string;
  description: string;
  source: string;
  scraped_at: string;
  upvotes: number;
  comments: number;
  author: string;
}

interface RedditResponse {
  data: {
    children: Array<{
      data: {
        title: string;
        url: string;
        permalink: string;
        selftext: string;
        ups: number;
        num_comments: number;
        author: string;
      }
    }>
  }
}

const CONFIG = {
  API_URL: 'https://www.reddit.com/r/devops/hot.json',
  POST_LIMIT: 50,
  MAX_DESCRIPTION_LENGTH: 300,
  REQUEST_TIMEOUT: 10000,
} as const;

const SCALE_KEYWORDS = [
  'kubernetes', 'docker', 'redis', 'kafka', 'microservices',
  'scaling', 'infrastructure', 'devops', 'ci/cd', 'monitoring',
  'aws', 'azure', 'gcp', 'cloud', 'terraform', 'ansible',
  'prometheus', 'grafana', 'elk', 'nginx', 'load balancer'
];

function isRelevant(title: string, selftext: string): boolean {
  const searchText = `${title} ${selftext}`.toLowerCase();
  return SCALE_KEYWORDS.some(keyword => searchText.includes(keyword));
}

async function scrapeReddit(): Promise<RedditPost[]> {
  try {
    const response = await axios.get<RedditResponse>(CONFIG.API_URL, {
      params: {
        limit: CONFIG.POST_LIMIT
      },
      headers: {
        'User-Agent': 'ArchWeekly-Scraper/1.0'
      },
      timeout: CONFIG.REQUEST_TIMEOUT,
    });
    
    const posts = response.data.data.children;
    const relevantPosts: RedditPost[] = [];
    
    for (const post of posts) {
      const data = post.data;
      
      if (isRelevant(data.title, data.selftext || '')) {
        relevantPosts.push({
          title: data.title,
          url: data.url.startsWith('http') ? data.url : `https://reddit.com${data.permalink}`,
          description: data.selftext?.substring(0, CONFIG.MAX_DESCRIPTION_LENGTH) || 'Discussion on r/devops',
          source: 'reddit',
          scraped_at: new Date().toISOString(),
          upvotes: data.ups,
          comments: data.num_comments,
          author: data.author
        });
      }
    }
    
    return relevantPosts;
  } catch (error: any) {
    return [];
  }
}

export { scrapeReddit, RedditPost };