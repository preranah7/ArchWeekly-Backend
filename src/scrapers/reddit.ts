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

// Type for Reddit API response
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

// Keywords for filtering ScaleWeekly content
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
    console.log('📡 Fetching Reddit r/devops...');
    
    // Reddit JSON API (no auth needed for reading)
    // Get hot posts from r/devops
    const response = await axios.get<RedditResponse>('https://www.reddit.com/r/devops/hot.json', {
      params: {
        limit: 50
      },
      headers: {
        'User-Agent': 'ScaleWeekly-Scraper/1.0'
      }
    });
    
    const posts = response.data.data.children;
    console.log(`✅ Downloaded ${posts.length} posts from r/devops`);
    
    const relevantPosts: RedditPost[] = [];
    
    for (const post of posts) {
      const data = post.data;
      
      // Filter for ScaleWeekly relevance
      if (isRelevant(data.title, data.selftext || '')) {
        relevantPosts.push({
          title: data.title,
          url: data.url.startsWith('http') ? data.url : `https://reddit.com${data.permalink}`,
          description: data.selftext?.substring(0, 300) || 'Discussion on r/devops',
          source: 'reddit',
          scraped_at: new Date().toISOString(),
          upvotes: data.ups,
          comments: data.num_comments,
          author: data.author
        });
        
        console.log(`✅ Relevant: ${data.title} (${data.ups} upvotes)`);
      }
    }
    
    console.log(`\n✅ Found ${relevantPosts.length} ScaleWeekly-relevant posts\n`);
    return relevantPosts;
    
  } catch (error: any) {
    console.error('❌ Error scraping Reddit:', error.message);
    return [];
  }
}

export { scrapeReddit, RedditPost };
