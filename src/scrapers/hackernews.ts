//src/scrapers/hackernews.ts
import axios from 'axios';
import { load } from 'cheerio';

interface Story {
  title: string;
  url: string;
  source: string;
  scraped_at: string;
}

const SCALE_KEYWORDS = [
  'redis', 'kafka', 'kubernetes', 'docker', 'microservices',
  'system design', 'scalability', 'distributed', 'scale',
  'load balancing', 'caching', 'database', 'optimization',
  'devops', 'ci/cd', 'architecture', 'performance',
  'aws', 'azure', 'gcp', 'cloud', 'infrastructure',
  'monitoring', 'postgresql', 'mongodb', 'nginx'
];

const CONFIG = {
  BASE_URL: 'https://news.ycombinator.com/',
  REQUEST_TIMEOUT: 10000,
} as const;

function isRelevant(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return SCALE_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

async function scrapeHackerNews(): Promise<Story[]> {
  try {
    const response = await axios.get<string>(CONFIG.BASE_URL, {
      timeout: CONFIG.REQUEST_TIMEOUT,
    });
    
    const $ = load(response.data);
    const stories: Story[] = [];
    
    $('span.titleline').each((index, element) => {
      const titleLink = $(element).find('a').first();
      const title = titleLink.text();
      const url = titleLink.attr('href');
      
      if (title && url && isRelevant(title)) {
        const fullUrl = url.startsWith('http') 
          ? url 
          : `${CONFIG.BASE_URL}${url}`;
        
        stories.push({
          title,
          url: fullUrl,
          source: 'hackernews',
          scraped_at: new Date().toISOString()
        });
      }
    });
    
    return stories;
  } catch (error: any) {
    return [];
  }
}

export { scrapeHackerNews, Story };