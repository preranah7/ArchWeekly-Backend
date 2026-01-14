import axios from 'axios';


interface GitHubResource {
  title: string;
  url: string;
  description: string;
  source: string;
  type: 'article' | 'guide' | 'diagram';
  topics: string[];
  diagrams?: Array<{ url: string; description: string; source: string }>;
  hasVisuals: boolean;
  scrapedAt: string;
}


/**
 * Dynamically scrape System Design Primer repository
 */
async function scrapeSystemDesignPrimer(): Promise<GitHubResource[]> {
  try {
    console.log('📚 Fetching System Design Primer from GitHub...');
    
    const repoUrl = 'https://raw.githubusercontent.com/donnemartin/system-design-primer/master/README.md';
    const response = await axios.get(repoUrl, {
      headers: {
        'User-Agent': 'ScaleWeekly-SystemDesign-Scraper/1.0'
      },
      timeout: 15000,
    });


    const markdown = response.data as string;
    const resources: GitHubResource[] = [];


    const lines = markdown.split('\n');
    let currentSection: any = null;
    let inMainContent = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.toLowerCase().includes('system design topics: start here')) {
        inMainContent = true;
        continue;
      }
      
      if (!inMainContent) continue;
      
      const headingMatch = line.match(/^##\s+([^#\[].+)$/);
      
      if (headingMatch) {
        if (currentSection && currentSection.title && currentSection.description) {
          const slug = currentSection.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
          
          resources.push({
            title: currentSection.title,
            url: `https://github.com/donnemartin/system-design-primer#${slug}`,
            description: currentSection.description,
            source: 'github-system-design-primer',
            type: 'guide',
            topics: extractTopics(currentSection.title),
            hasVisuals: currentSection.diagrams.length > 0,
            diagrams: currentSection.diagrams.length > 0 ? currentSection.diagrams : undefined,
            scrapedAt: new Date().toISOString(),
          });
        }
        
        currentSection = {
          title: headingMatch[1].trim(),
          description: '',
          diagrams: []
        };
      } 
      else if (currentSection && !currentSection.description && line && 
               !line.startsWith('#') && 
               !line.startsWith('*') && 
               !line.startsWith('-') &&
               !line.startsWith('!') &&
               !line.startsWith('>') &&
               !line.startsWith('|') &&
               !line.startsWith('<') &&
               line.length > 30) {
        currentSection.description = line;
      }
      else if (currentSection && line.includes('![') && line.includes('](')) {
        const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imgMatch) {
          const imageUrl = imgMatch[2].startsWith('http') 
            ? imgMatch[2] 
            : `https://github.com/donnemartin/system-design-primer/raw/master/${imgMatch[2]}`;
          
          currentSection.diagrams.push({
            url: imageUrl,
            description: imgMatch[1] || 'Diagram',
            source: 'github'
          });
        }
      }
    }
    
    if (currentSection && currentSection.title && currentSection.description) {
      const slug = currentSection.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      
      resources.push({
        title: currentSection.title,
        url: `https://github.com/donnemartin/system-design-primer#${slug}`,
        description: currentSection.description,
        source: 'github-system-design-primer',
        type: 'guide',
        topics: extractTopics(currentSection.title),
        hasVisuals: currentSection.diagrams.length > 0,
        diagrams: currentSection.diagrams.length > 0 ? currentSection.diagrams : undefined,
        scrapedAt: new Date().toISOString(),
      });
    }
    
    console.log(`✅ Scraped ${resources.length} resources from System Design Primer\n`);
    return resources;


  } catch (error: any) {
    console.error('❌ Error scraping System Design Primer:', error.message);
    return [];
  }
}


/**
 * Quality score calculator for ByteByteGo resources
 * Higher score = more relevant and high-quality content
 */
function calculateQualityScore(title: string): number {
  let score = 0;
  const lowerTitle = title.toLowerCase();
  
  // High-value topics (core system design concepts) +3
  const highValueKeywords = [
    'architecture', 'design pattern', 'scalability', 'microservices', 
    'distributed systems', 'load balanc', 'database', 'caching', 
    'message queue', 'api gateway', 'consistency', 'availability',
    'partitioning', 'replication', 'sharding', 'cap theorem',
    'horizontal scaling', 'vertical scaling', 'rate limiting',
    'circuit breaker', 'cdn', 'reverse proxy', 'idempotency'
  ];
  
  if (highValueKeywords.some(kw => lowerTitle.includes(kw))) {
    score += 3;
  }
  
  // Medium-value topics (specific technologies/protocols) +2
  const mediumValueKeywords = [
    'rest api', 'graphql', 'grpc', 'websocket', 'kafka', 'rabbitmq',
    'redis', 'mongodb', 'postgresql', 'cassandra', 'elasticsearch',
    'kubernetes', 'docker', 'nginx', 'http', 'tcp', 'dns',
    'oauth', 'jwt', 'ssl/tls', 'aws', 'azure', 'gcp'
  ];
  
  if (mediumValueKeywords.some(kw => lowerTitle.includes(kw))) {
    score += 2;
  }
  
  // Comparison articles are valuable +2
  if (/\svs\.?\s|\sversus\s/i.test(title)) {
    score += 2;
  }
  
  // "How to" guides are practical +1
  if (/^how\s|how\sto\s/i.test(title)) {
    score += 1;
  }
  
  // Penalize very short titles (likely not substantial content) -2
  if (title.length < 15) {
    score -= 2;
  }
  
  // Penalize overly long titles (might be too specific/niche) -1
  if (title.length > 80) {
    score -= 1;
  }
  
  // Penalize generic titles -3
  const genericTerms = ['introduction', 'basics', 'overview', 'beginner', 'tutorial'];
  if (genericTerms.some(term => lowerTitle.includes(term))) {
    score -= 3;
  }
  
  // Bonus for mentions of specific companies/products +1
  const companyMentions = ['netflix', 'uber', 'airbnb', 'twitter', 'facebook', 'amazon', 'google', 'stripe'];
  if (companyMentions.some(company => lowerTitle.includes(company))) {
    score += 1;
  }
  
  return score;
}


/**
 * Check if title is high-quality technical content
 */
function isHighQualityContent(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  
  // Must have at least one core technical keyword
  const coreTechnicalKeywords = [
    'api', 'system', 'design', 'architecture', 'database', 'server', 
    'network', 'protocol', 'cloud', 'scale', 'cache', 'load', 
    'security', 'distributed', 'microservice', 'queue', 'storage',
    'http', 'tcp', 'dns', 'kubernetes', 'docker', 'monitoring',
    'deployment', 'authentication', 'authorization', 'encryption'
  ];
  
  const hasCoreKeyword = coreTechnicalKeywords.some(kw => lowerTitle.includes(kw));
  if (!hasCoreKeyword) return false;
  
  // Exclude low-quality patterns
  const lowQualityPatterns = [
    /^image$/i,
    /^diagram$/i,
    /^figure\s*\d+/i,
    /^chart/i,
    /^table/i,
    /^\d+\.\d+$/,
    /^click here/i,
    /^learn more/i,
    /^read more/i,
    /^see more/i,
    /^subscribe/i,
    /^follow/i,
    /^star/i,
    /^fork/i,
    /^bookmark/i,
    /^newsletter/i,
    /^license/i,
    /^copyright/i,
    /^back to/i,
    /^table of contents/i,
    /^toc$/i,
  ];
  
  if (lowQualityPatterns.some(pattern => pattern.test(title))) {
    return false;
  }
  
  // Title should be meaningful (not just numbers or single words)
  if (/^\d+$/.test(title) || title.split(/\s+/).length < 2) {
    return false;
  }
  
  return true;
}


/**
 * ByteByteGo scraper - EXTRACTS DEEP LINKS to bytebytego.com articles
 */
async function scrapeByteByteGo(): Promise<GitHubResource[]> {
  try {
    console.log('📚 Fetching ByteByteGo System Design 101 (GitHub)...');
    
    const repoUrl = 'https://raw.githubusercontent.com/ByteByteGoHq/system-design-101/main/README.md';
    const response = await axios.get(repoUrl, {
      headers: {
        'User-Agent': 'ScaleWeekly-SystemDesign-Scraper/1.0'
      },
      timeout: 15000,
    });


    const markdown = response.data as string;
    const resources: GitHubResource[] = [];
    const seenUrls = new Set<string>();
    
    // Extract all markdown links: [Title](URL)
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    
    while ((match = linkPattern.exec(markdown)) !== null) {
      const title = match[1].replace(/\*\*/g, '').trim(); // Remove bold syntax
      const url = match[2].trim();
      
      // Only include ByteByteGo article links
      if (!url.includes('bytebytego.com/guides/') && !url.includes('bytebytego.com/courses/')) {
        continue;
      }
      
      // Skip duplicates
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      
      // Skip if title is too short or low quality
      if (title.length < 10 || !isHighQualityContent(title)) continue;
      
      // Calculate quality score
      const qualityScore = calculateQualityScore(title);
      if (qualityScore < 1) continue;
      
      resources.push({
        title: title,
        url: url, // ✅ Direct link to ByteByteGo article!
        description: `Learn about ${title.toLowerCase()} with visual explanations from ByteByteGo.`,
        source: 'github-bytebyteGo',
        type: 'article',
        topics: extractTopics(title),
        hasVisuals: true, // ByteByteGo is known for visual guides
        scrapedAt: new Date().toISOString(),
      });
    }
    
    console.log(`✅ Scraped ${resources.length} high-quality resources from ByteByteGo GitHub\n`);
    return resources;


  } catch (error: any) {
    console.error('❌ Error scraping ByteByteGo:', error.message);
    return [];
  }
}


/**
 * Extract relevant topics from title using keyword matching
 */
function extractTopics(title: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    'Performance': ['performance', 'latency', 'throughput', 'optimization', 'speed'],
    'Scalability': ['scalability', 'scale', 'scaling', 'horizontal', 'vertical'],
    'Caching': ['cache', 'caching', 'redis', 'memcached', 'cdn'],
    'Database': ['database', 'sql', 'nosql', 'db', 'rdbms', 'postgres', 'mysql', 'mongodb', 'cassandra', 'dynamodb'],
    'Load Balancing': ['load balanc', 'balancer', 'nginx', 'haproxy'],
    'CDN': ['cdn', 'content delivery'],
    'API': ['api', 'rest', 'graphql', 'grpc', 'webhook', 'websocket', 'gateway'],
    'Security': ['security', 'https', 'encryption', 'authentication', 'ssl', 'tls', 'oauth'],
    'Architecture': ['architecture', 'design pattern', 'microservice', 'monolith', 'service', 'mvc'],
    'DevOps': ['devops', 'ci/cd', 'docker', 'kubernetes', 'deployment', 'container', 'sre', 'platform engineering'],
    'Networking': ['network', 'tcp', 'udp', 'dns', 'http', 'protocol', 'proxy', 'ipv4', 'ipv6'],
    'Distributed Systems': ['distributed', 'cap theorem', 'consistency', 'partition', 'availability', 'consensus'],
    'Message Queue': ['queue', 'message', 'async', 'kafka', 'rabbitmq', 'pubsub'],
    'Monitoring': ['monitor', 'observability', 'logging', 'metrics', 'tracing'],
    'Storage': ['storage', 'blob', 's3', 'object storage', 'file system', 'b-tree', 'lsm'],
    'Git': ['git', 'version control', 'merge', 'rebase', 'branch', 'monorepo', 'microrepo'],
    'Payment': ['payment', 'visa', 'credit card', 'fintech', 'wallet', 'upi', 'mastercard'],
    'Cloud': ['aws', 'azure', 'gcp', 'cloud'],
  };
  
  const topics: string[] = [];
  const lowerTitle = title.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      topics.push(topic);
    }
  }
  
  return topics.length > 0 ? topics : ['System Design'];
}


/**
 * Main function to run all GitHub scrapers
 */
export async function scrapeGitHubSystemDesign(): Promise<GitHubResource[]> {
  console.log('\n📖 SCRAPING GITHUB SYSTEM DESIGN RESOURCES...\n');
  
  const [primerResources, byteByteGoResources] = await Promise.all([
    scrapeSystemDesignPrimer(),
    scrapeByteByteGo(),
  ]);


  const allResources = [...primerResources, ...byteByteGoResources];


  console.log(`\n✅ TOTAL GITHUB RESOURCES SCRAPED: ${allResources.length}`);
  console.log(`   📚 System Design Primer: ${primerResources.length}`);
  console.log(`   🎨 ByteByteGo: ${byteByteGoResources.length}\n`);


  return allResources;
}


export { GitHubResource };
