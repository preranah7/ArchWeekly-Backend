import axios from 'axios';

interface Article {
  title: string;
  url: string;
  description: string;
  source: string;
  scraped_at: string;
  tags: string[];
  published_at: string;
}

// Type definition for Dev.to API response
interface DevToArticle {
  title: string;
  url: string;
  description: string;
  tag_list: string[];
  published_at: string;
}

// Keywords for ScaleWeekly niche
const SCALE_KEYWORDS = [
  'redis', 'kafka', 'kubernetes', 'docker', 'microservices',
  'system design', 'scalability', 'distributed systems',
  'load balancing', 'caching', 'database optimization',
  'devops', 'ci/cd', 'architecture', 'performance',
  'aws', 'azure', 'gcp', 'cloud', 'infrastructure',
  'monitoring', 'postgresql', 'mongodb', 'nginx',
  'rabbitmq', 'elasticsearch', 'graphql', 'api design'
];

// Check if article is relevant to ScaleWeekly
function isRelevant(article: DevToArticle): boolean {
  const searchText = `${article.title} ${article.description} ${article.tag_list.join(' ')}`.toLowerCase();
  
  // Check if article mentions any scale-related keywords
  return SCALE_KEYWORDS.some(keyword => searchText.includes(keyword));
}

async function scrapeDevTo(): Promise<Article[]> {
  try {
    console.log('📡 Fetching Dev.to articles...');
    
    // Dev.to has a FREE public API!
    // Get top 50 articles from last week
    const response = await axios.get<DevToArticle[]>('https://dev.to/api/articles', {
      params: {
        per_page: 50,
        top: 7  // top articles from last 7 days
      }
    });
    
    const allArticles = response.data;
    console.log(`✅ Downloaded ${allArticles.length} articles`);
    
    // Filter for ScaleWeekly-relevant content
    const relevantArticles: Article[] = [];
    
    for (const article of allArticles) {
      if (isRelevant(article)) {
        relevantArticles.push({
          title: article.title,
          url: article.url,
          description: article.description || '',
          source: 'devto',
          scraped_at: new Date().toISOString(),
          tags: article.tag_list || [],
          published_at: article.published_at
        });
        
        console.log(`✅ Relevant: ${article.title}`);
      }
    }
    
    console.log(`\n✅ Found ${relevantArticles.length} ScaleWeekly-relevant articles\n`);
    return relevantArticles;
    
  } catch (error: any) {
    console.error('❌ Error scraping Dev.to:', error.message);
    return [];
  }
}

// Export for use in other files
export { scrapeDevTo, Article };
