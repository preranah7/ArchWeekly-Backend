import axios from 'axios';
import { load } from 'cheerio';

interface Repository {
  title: string;
  url: string;
  description: string;
  source: string;
  scraped_at: string;
  language: string;
  stars_today: string;
}

async function scrapeGitHub(): Promise<Repository[]> {
  try {
    console.log('📡 Fetching GitHub Trending...');
    
    // GitHub Trending page
    const response = await axios.get<string>('https://github.com/trending', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const $ = load(html);
    
    console.log('✅ Downloaded GitHub Trending page');
    
    const repos: Repository[] = [];
    
    // GitHub trending uses article tags for each repo
    $('article.Box-row').each((index, element) => {
      const repoLink = $(element).find('h2 a').first();
      const repoName = repoLink.text().trim().replace(/\s+/g, '');
      const repoUrl = 'https://github.com' + repoLink.attr('href');
      
      const description = $(element).find('p.col-9').text().trim() || 'No description';
      const language = $(element).find('[itemprop="programmingLanguage"]').text().trim() || 'Unknown';
      const starsToday = $(element).find('.float-sm-right').text().trim() || '0';
      
      if (repoName && repoUrl) {
        repos.push({
          title: repoName,
          url: repoUrl,
          description: description,
          source: 'github',
          scraped_at: new Date().toISOString(),
          language: language,
          stars_today: starsToday
        });
        
        console.log(`✅ Found: ${repoName} (${language})`);
      }
    });
    
    console.log(`\n✅ Found ${repos.length} trending repositories\n`);
    return repos;
    
  } catch (error: any) {
    console.error('❌ Error scraping GitHub:', error.message);
    return [];
  }
}

export { scrapeGitHub, Repository };
