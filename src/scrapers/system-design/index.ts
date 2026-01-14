import { scrapeGitHubSystemDesign, GitHubResource } from './github-repos';
import { scrapeYouTubeSystemDesign, YouTubeResource } from './youtube-videos';
import { scrapeEngineeringBlogsSD, BlogResource } from './engineering-blogs-sd';

// Unified resource type
export interface SystemDesignResource {
  title: string;
  url: string;
  description: string;
  source: string;
  type: 'article' | 'video' | 'guide' | 'diagram';
  topics: string[];
  hasVisuals: boolean;
  thumbnail?: string;
  estimatedTime?: number;
  diagrams?: Array<{ url: string; description: string; source: string }>;
  scrapedAt: string;
  publishedDate?: string;
}

/**
 * Main function to run all System Design scrapers
 */
export async function scrapeAllSystemDesignResources(): Promise<SystemDesignResource[]> {
  console.log('\n' + '='.repeat(70));
  console.log('🎓 SYSTEM DESIGN RESOURCE AGGREGATOR');
  console.log('='.repeat(70) + '\n');

  try {
    // Run all scrapers in parallel
    const [githubResources, youtubeResources, blogResources] = await Promise.all([
      scrapeGitHubSystemDesign(),
      scrapeYouTubeSystemDesign(),
      scrapeEngineeringBlogsSD(),
    ]);

    // Normalize all resources to unified format
    const allResources: SystemDesignResource[] = [
      // GitHub resources
      ...githubResources.map(r => ({
        title: r.title,
        url: r.url,
        description: r.description,
        source: r.source,
        type: r.type as 'article' | 'video' | 'guide' | 'diagram',
        topics: r.topics,
        hasVisuals: r.hasVisuals,
        diagrams: r.diagrams,
        scrapedAt: r.scrapedAt,
        estimatedTime: undefined,
        thumbnail: undefined,
        publishedDate: undefined,
      })),

      // YouTube resources
      ...youtubeResources.map(r => ({
        title: r.title,
        url: r.url,
        description: r.description,
        source: r.source,
        type: 'video' as const,
        topics: r.topics,
        hasVisuals: r.hasVisuals,
        thumbnail: r.thumbnail,
        estimatedTime: r.estimatedTime,
        scrapedAt: r.scrapedAt,
        diagrams: undefined,
        publishedDate: undefined,
      })),

      // Blog resources
      ...blogResources.map(r => ({
        title: r.title,
        url: r.url,
        description: r.description,
        source: r.source,
        type: 'article' as const,
        topics: r.topics,
        hasVisuals: r.hasVisuals,
        scrapedAt: r.scrapedAt,
        publishedDate: r.publishedDate,
        estimatedTime: undefined,
        thumbnail: undefined,
        diagrams: undefined,
      })),
    ];

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SCRAPING SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ GitHub Resources: ${githubResources.length}`);
    console.log(`✅ YouTube Videos: ${youtubeResources.length}`);
    console.log(`✅ Engineering Blogs: ${blogResources.length}`);
    console.log(`📦 TOTAL RESOURCES: ${allResources.length}`);
    console.log('='.repeat(70) + '\n');

    return allResources;

  } catch (error) {
    console.error('❌ Error in system design scrapers:', error);
    throw error;
  }
}