import axios from 'axios';
import { load } from 'cheerio';

interface Story {
  title: string;
  url: string;
  source: string;
  scraped_at: string;
}

// ScaleWeekly keywords
const SCALE_KEYWORDS = [
  'redis', 'kafka', 'kubernetes', 'docker', 'microservices',
  'system design', 'scalability', 'distributed', 'scale',
  'load balancing', 'caching', 'database', 'optimization',
  'devops', 'ci/cd', 'architecture', 'performance',
  'aws', 'azure', 'gcp', 'cloud', 'infrastructure',
  'monitoring', 'postgresql', 'mongodb', 'nginx'
];

function isRelevant(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return SCALE_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

async function scrapeHackerNews(): Promise<Story[]> {
  try {
    console.log('📡 Fetching HackerNews...');
    
    const response = await axios.get<string>('https://news.ycombinator.com/');
    const html = response.data;
    
    console.log('✅ Downloaded HTML');
    
    const $ = load(html);
    const stories: Story[] = [];
    
    $('span.titleline').each((index, element) => {
      const titleLink = $(element).find('a').first();
      const title = titleLink.text();
      const url = titleLink.attr('href');
      
      if (title && url) {
        // Only add if relevant to ScaleWeekly
        if (isRelevant(title)) {
          const fullUrl = url.startsWith('http') 
            ? url 
            : `https://news.ycombinator.com/${url}`;
          
          stories.push({
            title,
            url: fullUrl,
            source: 'hackernews',
            scraped_at: new Date().toISOString()
          });
          
          console.log(`✅ Relevant: ${title}`);
        }
      }
    });
    
    console.log(`\n✅ Found ${stories.length} ScaleWeekly-relevant stories\n`);
    return stories;
    
  } catch (error: any) {
    console.error('❌ Error scraping HackerNews:', error.message);
    return [];
  }
}

export { scrapeHackerNews, Story };
