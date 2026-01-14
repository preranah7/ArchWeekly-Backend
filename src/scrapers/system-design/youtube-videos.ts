import { youtube_v3 } from '@googleapis/youtube';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

interface YouTubeResource {
  title: string;
  url: string;
  description: string;
  source: string;
  type: 'video';
  topics: string[];
  thumbnail?: string;
  hasVisuals: boolean;
  estimatedTime?: number; // Duration in minutes
  scrapedAt: string;
}

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Convert ISO 8601 duration (PT1H2M10S) to minutes
 */
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 10; // Default 10 minutes
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

/**
 * Extract topics from video title and description
 */
function extractTopics(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const topicKeywords: Record<string, string> = {
    'microservices': 'Microservices',
    'kubernetes': 'Kubernetes',
    'docker': 'Docker',
    'distributed': 'Distributed Systems',
    'scalability': 'Scalability',
    'caching': 'Caching',
    'database': 'Databases',
    'load balancing': 'Load Balancing',
    'api design': 'API Design',
    'system design': 'System Design',
    'architecture': 'Architecture',
    'redis': 'Redis',
    'kafka': 'Kafka',
    'nosql': 'NoSQL',
    'sql': 'SQL',
    'rest api': 'REST API',
    'graphql': 'GraphQL',
    'messaging': 'Message Queues',
    'cdn': 'CDN',
    'monitoring': 'Monitoring',
  };

  const foundTopics = new Set<string>();
  
  Object.entries(topicKeywords).forEach(([keyword, topic]) => {
    if (text.includes(keyword)) {
      foundTopics.add(topic);
    }
  });

  return Array.from(foundTopics).slice(0, 5); // Max 5 topics
}

/**
 * Scrape System Design videos from freeCodeCamp
 */
async function scrapeFreeCodeCamp(): Promise<YouTubeResource[]> {
  try {
    console.log('🎥 Fetching freeCodeCamp System Design videos...');

    // Search for system design videos from freeCodeCamp channel
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      channelId: 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp channel ID
      q: 'system design',
      type: ['video'],
      maxResults: 10,
      order: 'relevance',
      relevanceLanguage: 'en',
    });

    const videoIds = searchResponse.data.items
      ?.map((item: youtube_v3.Schema$SearchResult) => item.id?.videoId)
      .filter((id: string | null | undefined): id is string => !!id) || [];

    if (videoIds.length === 0) {
      console.log('⚠️  No videos found from freeCodeCamp');
      return [];
    }

    // Get video details (duration, etc.)
    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const resources: YouTubeResource[] = [];

    videosResponse.data.items?.forEach((video: youtube_v3.Schema$Video) => {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      if (!snippet || !contentDetails) return;

      const duration = parseISO8601Duration(contentDetails.duration || 'PT10M');
      const title = snippet.title || 'Untitled';
      const description = snippet.description || '';
      const topics = extractTopics(title, description);

      // Handle thumbnail with proper null checking
      const thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || undefined;

      resources.push({
        title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
        source: 'youtube-freeCodeCamp',
        type: 'video',
        topics: topics.length > 0 ? topics : ['System Design'],
        thumbnail: thumbnailUrl,
        hasVisuals: true, // Videos always have visuals
        estimatedTime: duration,
        scrapedAt: new Date().toISOString(),
      });
    });

    console.log(`✅ Scraped ${resources.length} videos from freeCodeCamp\n`);
    return resources;

  } catch (error: any) {
    console.error('❌ Error scraping freeCodeCamp:', error.message);
    return [];
  }
}

/**
 * Scrape ByteByteGo (Alex Xu) YouTube channel
 */
async function scrapeByteByteGoYouTube(): Promise<YouTubeResource[]> {
  try {
    console.log('🎥 Fetching ByteByteGo YouTube videos...');

    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      channelId: 'UCZgt6AzoyjslHTC9dz0UoTw', // ByteByteGo channel ID
      type: ['video'],
      maxResults: 10,
      order: 'date', // Get latest videos
    });

    const videoIds = searchResponse.data.items
      ?.map((item: youtube_v3.Schema$SearchResult) => item.id?.videoId)
      .filter((id: string | null | undefined): id is string => !!id) || [];

    if (videoIds.length === 0) {
      console.log('⚠️  No videos found from ByteByteGo');
      return [];
    }

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const resources: YouTubeResource[] = [];

    videosResponse.data.items?.forEach((video: youtube_v3.Schema$Video) => {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      if (!snippet || !contentDetails) return;

      const duration = parseISO8601Duration(contentDetails.duration || 'PT10M');
      const title = snippet.title || 'Untitled';
      const description = snippet.description || '';
      const topics = extractTopics(title, description);

      // Handle thumbnail with proper null checking
      const thumbnailUrl = snippet.thumbnails?.high?.url || undefined;

      resources.push({
        title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
        source: 'youtube-ByteByteGo',
        type: 'video',
        topics: topics.length > 0 ? topics : ['System Design'],
        thumbnail: thumbnailUrl,
        hasVisuals: true,
        estimatedTime: duration,
        scrapedAt: new Date().toISOString(),
      });
    });

    console.log(`✅ Scraped ${resources.length} videos from ByteByteGo\n`);
    return resources;

  } catch (error: any) {
    console.error('❌ Error scraping ByteByteGo:', error.message);
    return [];
  }
}

/**
 * Scrape Gaurav Sen's System Design playlist
 */
async function scrapeGauravSen(): Promise<YouTubeResource[]> {
  try {
    console.log('🎥 Fetching Gaurav Sen System Design videos...');

    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      channelId: 'UCRPMAqdtSgd0Ipeef7iFsKw', // Gaurav Sen channel ID
      q: 'system design',
      type: ['video'],
      maxResults: 8,
      order: 'relevance',
    });

    const videoIds = searchResponse.data.items
      ?.map((item: youtube_v3.Schema$SearchResult) => item.id?.videoId)
      .filter((id: string | null | undefined): id is string => !!id) || [];

    if (videoIds.length === 0) {
      console.log('⚠️  No videos found from Gaurav Sen');
      return [];
    }

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const resources: YouTubeResource[] = [];

    videosResponse.data.items?.forEach((video: youtube_v3.Schema$Video) => {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      if (!snippet || !contentDetails) return;

      const duration = parseISO8601Duration(contentDetails.duration || 'PT10M');
      const title = snippet.title || 'Untitled';
      const description = snippet.description || '';
      const topics = extractTopics(title, description);

      // Handle thumbnail with proper null checking
      const thumbnailUrl = snippet.thumbnails?.high?.url || undefined;

      resources.push({
        title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
        source: 'youtube-GauravSen',
        type: 'video',
        topics: topics.length > 0 ? topics : ['System Design'],
        thumbnail: thumbnailUrl,
        hasVisuals: true,
        estimatedTime: duration,
        scrapedAt: new Date().toISOString(),
      });
    });

    console.log(`✅ Scraped ${resources.length} videos from Gaurav Sen\n`);
    return resources;

  } catch (error: any) {
    console.error('❌ Error scraping Gaurav Sen:', error.message);
    return [];
  }
}

/**
 * Main function to scrape all YouTube channels
 */
export async function scrapeYouTubeSystemDesign(): Promise<YouTubeResource[]> {
  console.log('\n🎬 SCRAPING YOUTUBE SYSTEM DESIGN VIDEOS...\n');

  const [freeCodeCamp, byteByteGo, gauravSen] = await Promise.all([
    scrapeFreeCodeCamp(),
    scrapeByteByteGoYouTube(),
    scrapeGauravSen(),
  ]);

  const allResources = [...freeCodeCamp, ...byteByteGo, ...gauravSen];

  console.log(`\n✅ TOTAL YOUTUBE VIDEOS SCRAPED: ${allResources.length}`);
  console.log(`   🎓 freeCodeCamp: ${freeCodeCamp.length}`);
  console.log(`   🎨 ByteByteGo: ${byteByteGo.length}`);
  console.log(`   👨‍💻 Gaurav Sen: ${gauravSen.length}\n`);

  return allResources;
}

export { YouTubeResource };