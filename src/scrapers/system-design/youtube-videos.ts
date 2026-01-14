//src/scrapers/system-design/youtube-videos.ts
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
  estimatedTime?: number;
  scrapedAt: string;
}

const CONFIG = {
  FREECODECAMP_CHANNEL_ID: 'UC8butISFwT-Wl7EV0hUK0BQ',
  BYTEBYTEGO_CHANNEL_ID: 'UCZgt6AzoyjslHTC9dz0UoTw',
  GAURAVSEN_CHANNEL_ID: 'UCRPMAqdtSgd0Ipeef7iFsKw',
  MAX_RESULTS: 10,
  GAURAV_SEN_MAX_RESULTS: 8,
  MAX_DESCRIPTION_LENGTH: 300,
  DEFAULT_DURATION_MINUTES: 10,
  MAX_TOPICS: 5,
} as const;

const TOPIC_KEYWORDS: Record<string, string> = {
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

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return CONFIG.DEFAULT_DURATION_MINUTES;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

function extractTopics(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const foundTopics = new Set<string>();
  
  Object.entries(TOPIC_KEYWORDS).forEach(([keyword, topic]) => {
    if (text.includes(keyword)) {
      foundTopics.add(topic);
    }
  });

  return Array.from(foundTopics).slice(0, CONFIG.MAX_TOPICS);
}

async function scrapeFreeCodeCamp(): Promise<YouTubeResource[]> {
  try {
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      channelId: CONFIG.FREECODECAMP_CHANNEL_ID,
      q: 'system design',
      type: ['video'],
      maxResults: CONFIG.MAX_RESULTS,
      order: 'relevance',
      relevanceLanguage: 'en',
    });

    const videoIds = searchResponse.data.items
      ?.map((item: youtube_v3.Schema$SearchResult) => item.id?.videoId)
      .filter((id: string | null | undefined): id is string => !!id) || [];

    if (videoIds.length === 0) return [];

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const resources: YouTubeResource[] = [];

    videosResponse.data.items?.forEach((video: youtube_v3.Schema$Video) => {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      if (!snippet || !contentDetails) return;

      const duration = parseISO8601Duration(contentDetails.duration || `PT${CONFIG.DEFAULT_DURATION_MINUTES}M`);
      const title = snippet.title || 'Untitled';
      const description = snippet.description || '';
      const topics = extractTopics(title, description);
      const thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || undefined;

      resources.push({
        title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        description: description.substring(0, CONFIG.MAX_DESCRIPTION_LENGTH) + (description.length > CONFIG.MAX_DESCRIPTION_LENGTH ? '...' : ''),
        source: 'youtube-freeCodeCamp',
        type: 'video',
        topics: topics.length > 0 ? topics : ['System Design'],
        thumbnail: thumbnailUrl,
        hasVisuals: true,
        estimatedTime: duration,
        scrapedAt: new Date().toISOString(),
      });
    });

    return resources;
  } catch (error: any) {
    return [];
  }
}

async function scrapeByteByteGoYouTube(): Promise<YouTubeResource[]> {
  try {
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      channelId: CONFIG.BYTEBYTEGO_CHANNEL_ID,
      type: ['video'],
      maxResults: CONFIG.MAX_RESULTS,
      order: 'date',
    });

    const videoIds = searchResponse.data.items
      ?.map((item: youtube_v3.Schema$SearchResult) => item.id?.videoId)
      .filter((id: string | null | undefined): id is string => !!id) || [];

    if (videoIds.length === 0) return [];

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const resources: YouTubeResource[] = [];

    videosResponse.data.items?.forEach((video: youtube_v3.Schema$Video) => {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      if (!snippet || !contentDetails) return;

      const duration = parseISO8601Duration(contentDetails.duration || `PT${CONFIG.DEFAULT_DURATION_MINUTES}M`);
      const title = snippet.title || 'Untitled';
      const description = snippet.description || '';
      const topics = extractTopics(title, description);
      const thumbnailUrl = snippet.thumbnails?.high?.url || undefined;

      resources.push({
        title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        description: description.substring(0, CONFIG.MAX_DESCRIPTION_LENGTH) + (description.length > CONFIG.MAX_DESCRIPTION_LENGTH ? '...' : ''),
        source: 'youtube-ByteByteGo',
        type: 'video',
        topics: topics.length > 0 ? topics : ['System Design'],
        thumbnail: thumbnailUrl,
        hasVisuals: true,
        estimatedTime: duration,
        scrapedAt: new Date().toISOString(),
      });
    });

    return resources;
  } catch (error: any) {
    return [];
  }
}

async function scrapeGauravSen(): Promise<YouTubeResource[]> {
  try {
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      channelId: CONFIG.GAURAVSEN_CHANNEL_ID,
      q: 'system design',
      type: ['video'],
      maxResults: CONFIG.GAURAV_SEN_MAX_RESULTS,
      order: 'relevance',
    });

    const videoIds = searchResponse.data.items
      ?.map((item: youtube_v3.Schema$SearchResult) => item.id?.videoId)
      .filter((id: string | null | undefined): id is string => !!id) || [];

    if (videoIds.length === 0) return [];

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const resources: YouTubeResource[] = [];

    videosResponse.data.items?.forEach((video: youtube_v3.Schema$Video) => {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      if (!snippet || !contentDetails) return;

      const duration = parseISO8601Duration(contentDetails.duration || `PT${CONFIG.DEFAULT_DURATION_MINUTES}M`);
      const title = snippet.title || 'Untitled';
      const description = snippet.description || '';
      const topics = extractTopics(title, description);
      const thumbnailUrl = snippet.thumbnails?.high?.url || undefined;

      resources.push({
        title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        description: description.substring(0, CONFIG.MAX_DESCRIPTION_LENGTH) + (description.length > CONFIG.MAX_DESCRIPTION_LENGTH ? '...' : ''),
        source: 'youtube-GauravSen',
        type: 'video',
        topics: topics.length > 0 ? topics : ['System Design'],
        thumbnail: thumbnailUrl,
        hasVisuals: true,
        estimatedTime: duration,
        scrapedAt: new Date().toISOString(),
      });
    });

    return resources;
  } catch (error: any) {
    return [];
  }
}

export async function scrapeYouTubeSystemDesign(): Promise<YouTubeResource[]> {
  const [freeCodeCamp, byteByteGo, gauravSen] = await Promise.all([
    scrapeFreeCodeCamp(),
    scrapeByteByteGoYouTube(),
    scrapeGauravSen(),
  ]);

  return [...freeCodeCamp, ...byteByteGo, ...gauravSen];
}

export { YouTubeResource };