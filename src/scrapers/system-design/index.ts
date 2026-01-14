//src/scrapers/system-design/index.ts
import { scrapeGitHubSystemDesign, GitHubResource } from './github-repos';
import { scrapeYouTubeSystemDesign, YouTubeResource } from './youtube-videos';
import { scrapeEngineeringBlogsSD, BlogResource } from './engineering-blogs-sd';

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

export async function scrapeAllSystemDesignResources(): Promise<SystemDesignResource[]> {
  try {
    const [githubResources, youtubeResources, blogResources] = await Promise.all([
      scrapeGitHubSystemDesign(),
      scrapeYouTubeSystemDesign(),
      scrapeEngineeringBlogsSD(),
    ]);

    const allResources: SystemDesignResource[] = [
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

    return allResources;
  } catch (error) {
    throw error;
  }
}