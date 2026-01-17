//src/scrapers/system-design/github-repos.ts
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

const CONFIG = {
  REQUEST_TIMEOUT: 15000,
  MIN_DESCRIPTION_LENGTH: 30,
  MIN_TITLE_LENGTH: 10,
  QUALITY_SCORE_THRESHOLD: 1,
} as const;

const TOPIC_KEYWORDS: Record<string, string[]> = {
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

function extractTopics(title: string): string[] {
  const topics: string[] = [];
  const lowerTitle = title.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      topics.push(topic);
    }
  }
  
  return topics.length > 0 ? topics : ['System Design'];
}

function calculateQualityScore(title: string): number {
  let score = 0;
  const lowerTitle = title.toLowerCase();
  
  const highValueKeywords = [
    'architecture', 'design pattern', 'scalability', 'microservices', 
    'distributed systems', 'load balanc', 'database', 'caching', 
    'message queue', 'api gateway', 'consistency', 'availability',
    'partitioning', 'replication', 'sharding', 'cap theorem',
    'horizontal scaling', 'vertical scaling', 'rate limiting',
    'circuit breaker', 'cdn', 'reverse proxy', 'idempotency'
  ];
  
  if (highValueKeywords.some(kw => lowerTitle.includes(kw))) score += 3;
  
  const mediumValueKeywords = [
    'rest api', 'graphql', 'grpc', 'websocket', 'kafka', 'rabbitmq',
    'redis', 'mongodb', 'postgresql', 'cassandra', 'elasticsearch',
    'kubernetes', 'docker', 'nginx', 'http', 'tcp', 'dns',
    'oauth', 'jwt', 'ssl/tls', 'aws', 'azure', 'gcp'
  ];
  
  if (mediumValueKeywords.some(kw => lowerTitle.includes(kw))) score += 2;
  if (/\svs\.?\s|\sversus\s/i.test(title)) score += 2;
  if (/^how\s|how\sto\s/i.test(title)) score += 1;
  if (title.length < 15) score -= 2;
  if (title.length > 80) score -= 1;
  
  const genericTerms = ['introduction', 'basics', 'overview', 'beginner', 'tutorial'];
  if (genericTerms.some(term => lowerTitle.includes(term))) score -= 3;
  
  const companyMentions = ['netflix', 'uber', 'airbnb', 'twitter', 'facebook', 'amazon', 'google', 'stripe'];
  if (companyMentions.some(company => lowerTitle.includes(company))) score += 1;
  
  return score;
}

function isHighQualityContent(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  
  const coreTechnicalKeywords = [
    'api', 'system', 'design', 'architecture', 'database', 'server', 
    'network', 'protocol', 'cloud', 'scale', 'cache', 'load', 
    'security', 'distributed', 'microservice', 'queue', 'storage',
    'http', 'tcp', 'dns', 'kubernetes', 'docker', 'monitoring',
    'deployment', 'authentication', 'authorization', 'encryption'
  ];
  
  const hasCoreKeyword = coreTechnicalKeywords.some(kw => lowerTitle.includes(kw));
  if (!hasCoreKeyword) return false;
  
  const lowQualityPatterns = [
    /^image$/i, /^diagram$/i, /^figure\s*\d+/i, /^chart/i, /^table/i,
    /^\d+\.\d+$/, /^click here/i, /^learn more/i, /^read more/i,
    /^see more/i, /^subscribe/i, /^follow/i, /^star/i, /^fork/i,
    /^bookmark/i, /^newsletter/i, /^license/i, /^copyright/i,
    /^back to/i, /^table of contents/i, /^toc$/i,
  ];
  
  if (lowQualityPatterns.some(pattern => pattern.test(title))) return false;
  if (/^\d+$/.test(title) || title.split(/\s+/).length < 2) return false;
  
  return true;
}

async function scrapeSystemDesignPrimer(): Promise<GitHubResource[]> {
  try {
    const repoUrl = 'https://raw.githubusercontent.com/donnemartin/system-design-primer/master/README.md';
    const response = await axios.get(repoUrl, {
      headers: {
        'User-Agent': 'ArchWeekly-SystemDesign-Scraper/1.0'
      },
      timeout: CONFIG.REQUEST_TIMEOUT,
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
               !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-') &&
               !line.startsWith('!') && !line.startsWith('>') && !line.startsWith('|') &&
               !line.startsWith('<') && line.length > CONFIG.MIN_DESCRIPTION_LENGTH) {
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
    
    return resources;
  } catch (error: any) {
    return [];
  }
}

async function scrapeByteByteGo(): Promise<GitHubResource[]> {
  try {
    const repoUrl = 'https://raw.githubusercontent.com/ByteByteGoHq/system-design-101/main/README.md';
    const response = await axios.get(repoUrl, {
      headers: {
        'User-Agent': 'ArchWeekly-SystemDesign-Scraper/1.0'
      },
      timeout: CONFIG.REQUEST_TIMEOUT,
    });

    const markdown = response.data as string;
    const resources: GitHubResource[] = [];
    const seenUrls = new Set<string>();
    
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    
    while ((match = linkPattern.exec(markdown)) !== null) {
      const title = match[1].replace(/\*\*/g, '').trim();
      const url = match[2].trim();
      
      if (!url.includes('bytebytego.com/guides/') && !url.includes('bytebytego.com/courses/')) {
        continue;
      }
      
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      
      if (title.length < CONFIG.MIN_TITLE_LENGTH || !isHighQualityContent(title)) continue;
      
      const qualityScore = calculateQualityScore(title);
      if (qualityScore < CONFIG.QUALITY_SCORE_THRESHOLD) continue;
      
      resources.push({
        title: title,
        url: url,
        description: `Learn about ${title.toLowerCase()} with visual explanations from ByteByteGo.`,
        source: 'github-bytebyteGo',
        type: 'article',
        topics: extractTopics(title),
        hasVisuals: true,
        scrapedAt: new Date().toISOString(),
      });
    }
    
    return resources;
  } catch (error: any) {
    return [];
  }
}

export async function scrapeGitHubSystemDesign(): Promise<GitHubResource[]> {
  const [primerResources, byteByteGoResources] = await Promise.all([
    scrapeSystemDesignPrimer(),
    scrapeByteByteGo(),
  ]);

  return [...primerResources, ...byteByteGoResources];
}

export { GitHubResource };