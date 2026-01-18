//src/services/newsletter-sender.ts
import { Resend } from 'resend';
import dotenv from 'dotenv';
import User from '../models/User';
import Newsletter from '../models/Newsletter';
import Subscriber from '../models/Subscriber';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const CONFIG = {
  EMAIL_FROM: process.env.EMAIL_FROM || 'ArchWeekly <newsletter@archweekly.online>',
  NEWSLETTER_SUBJECT: 'ArchWeekly: This Week\'s Top Articles',
  TOP_ARTICLES_COUNT: 5,
  RATE_LIMIT_DELAY: 100,
} as const;

interface Article {
  rank: number;
  title: string;
  url: string;
  source: string;
  description: string;
  score: number;
  category: string;
  reasoning: string;
  keyInsights: string[];
}

interface NewsletterData {
  metadata: {
    generatedAt: string;
    generatedDate: string;
    totalScraped: number;
    topSelected: number;
    poweredBy: string;
  };
  topArticles: Article[];
}

interface SendResult {
  email: string;
  success: boolean;
  emailId?: string;
  error?: string;
}

function generateNewsletterHTML(data: NewsletterData, subscriberEmail: string): string {
  const { topArticles } = data;
  const topFive = topArticles.slice(0, CONFIG.TOP_ARTICLES_COUNT);
  
  const articlesHTML = topFive.map((article) => {
    const summary = article.description || article.reasoning;
    
    return `
      <div style="margin: 32px 0; padding-bottom: 32px; border-bottom: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; font-weight: 600; line-height: 1.4;">
          <a href="${article.url}" style="color: #1f2937; text-decoration: none;">
            ${article.title}
          </a>
        </h3>
        
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
          ${article.source} · ${article.category}
        </p>
        
        <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
          ${summary}
        </p>
        
        <a href="${article.url}" style="color: #2563eb; font-size: 14px; font-weight: 500; text-decoration: none;">
          Read more →
        </a>
      </div>
    `;
  }).join('');

  const unsubscribeUrl = `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
          }
          .container {
            max-width: 560px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 0;
          }
          .header {
            padding: 40px 32px;
            border-bottom: 1px solid #e5e7eb;
            text-align: center;
          }
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
          }
          .content {
            padding: 32px;
            background: #ffffff;
          }
          .intro {
            margin-bottom: 32px;
          }
          .intro h2 {
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          .intro p {
            margin: 0;
            color: #6b7280;
            font-size: 15px;
            line-height: 1.6;
          }
          .section-title {
            margin: 32px 0 24px 0;
            font-size: 14px;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .footer {
            padding: 32px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            font-size: 13px;
            color: #6b7280;
          }
          .footer p {
            margin: 8px 0;
          }
          .footer a {
            color: #2563eb;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          .divider {
            height: 1px;
            background: #e5e7eb;
            margin: 32px 0;
          }
          @media only screen and (max-width: 600px) {
            .container {
              width: 100% !important;
            }
            .header {
              padding: 24px 20px;
            }
            .content {
              padding: 20px;
            }
            .header h1 {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ArchWeekly</h1>
            <p>DevOps & System Design Insights</p>
          </div>
          
          <div class="content">
            <div class="intro">
              <h2>This Week's Reading</h2>
              <p>Five essential articles on system design, scalability, and DevOps practices from industry leaders.</p>
            </div>
            
            <div class="section-title">Articles</div>
            
            ${articlesHTML}
            
            <div class="divider"></div>
            
            <p style="margin: 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
              ArchWeekly curates the best technical content from High Scalability, Pragmatic Engineer, Cloudflare, AWS, and developer communities. Each week we select articles that deepen your understanding of building resilient, scalable systems.
            </p>
          </div>
          
          <div class="footer">
            <p>Questions or feedback? <a href="mailto:newsletter@archweekly.online">Let us know</a></p>
            <p style="margin-top: 16px;">
              <a href="${unsubscribeUrl}">Unsubscribe</a> · <a href="${process.env.FRONTEND_URL}">View in browser</a>
            </p>
            <p style="margin-top: 16px; opacity: 0.7;">
              ArchWeekly | ${new Date().getFullYear()}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendToRecipient(
  email: string, 
  newsletterData: NewsletterData
): Promise<SendResult> {
  try {
    const html = generateNewsletterHTML(newsletterData, email);

    const { data, error } = await resend.emails.send({
      from: CONFIG.EMAIL_FROM,
      to: email,
      subject: CONFIG.NEWSLETTER_SUBJECT,
      html: html,
    });

    if (error) {
      console.error(`❌ Resend error for ${email}:`, error);
      return {
        email,
        success: false,
        error: error.message || 'Unknown error',
      };
    }

    return {
      email,
      success: true,
      emailId: data?.id,
    };
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Exception sending to ${email}:`, err);
    return {
      email,
      success: false,
      error: err.message,
    };
  }
}

async function getAllActiveSubscribers(): Promise<string[]> {
  try {
    console.log('🔍 Fetching subscribers from database...');
    
    // Get verified users
    const users = await User.find({ isVerified: true }).select('email');
    const userEmails = users.map(u => u.email);
    console.log(`👤 Found ${userEmails.length} verified users:`, userEmails);

    // Get active subscribers
    const subscribers = await Subscriber.find({ isActive: true }).select('email');
    const subscriberEmails = subscribers.map(s => s.email);
    console.log(`📬 Found ${subscriberEmails.length} active subscribers:`, subscriberEmails);

    // Combine and deduplicate
    const allEmails = [...new Set([...userEmails, ...subscriberEmails])];
    console.log(`📧 Total unique recipients: ${allEmails.length}`, allEmails);
    
    return allEmails;
  } catch (error) {
    console.error('❌ Error fetching subscribers:', error);
    throw error;
  }
}

export async function sendNewsletterToAll(): Promise<{
  total: number;
  sent: number;
  failed: number;
  results: SendResult[];
  newsletterId?: string;
}> {
  try {
    console.log('📰 Starting newsletter send process...');
    
    // Import Article model dynamically to avoid circular dependencies
    const Article = (await import('../models/Article')).default;
    
    // Fetch top 5 ranked articles from database
    const topArticles = await Article.find({ 
      rank: { $exists: true, $ne: null } 
    })
      .sort({ rank: 1 })
      .limit(CONFIG.TOP_ARTICLES_COUNT);

    console.log(`📊 Found ${topArticles.length} ranked articles in database`);

    if (!topArticles || topArticles.length === 0) {
      console.log('⚠️ No ranked articles found!');
      throw new Error('No ranked articles found. Run the workflow first to scrape and score articles.');
    }

    // Create newsletter data structure from database articles
    const newsletterData: NewsletterData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedDate: new Date().toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        totalScraped: topArticles.length,
        topSelected: CONFIG.TOP_ARTICLES_COUNT,
        poweredBy: 'ArchWeekly AI'
      },
      topArticles: topArticles.map(article => ({
        rank: article.rank || 0,
        title: article.title,
        url: article.url,
        source: article.source,
        description: article.description || article.reasoning || '',
        score: article.score || 0,
        category: article.category || 'General',
        reasoning: article.reasoning || '',
        keyInsights: article.keyInsights || []
      }))
    };

    console.log('📝 Newsletter data prepared:', {
      date: newsletterData.metadata.generatedDate,
      articles: newsletterData.topArticles.length
    });

    // Get all subscribers
    const subscribers = await getAllActiveSubscribers();
    console.log(`📧 Preparing to send to ${subscribers.length} subscribers`);
    
    if (subscribers.length === 0) {
      console.log('⚠️ No subscribers found! Returning empty result.');
      return {
        total: 0,
        sent: 0,
        failed: 0,
        results: [],
      };
    }

    // Create newsletter record
    const newsletter = new Newsletter({
      title: `ArchWeekly - ${newsletterData.metadata.generatedDate}`,
      date: new Date(),
      articles: newsletterData.topArticles.map((article, index) => ({
        title: article.title,
        url: article.url,
        source: article.source,
        description: article.description,
        category: article.category,
        score: article.score,
        rank: index + 1,
        reasoning: article.reasoning,
        keyInsights: article.keyInsights,
      })),
      status: 'draft',
    });

    await newsletter.save();
    console.log(`💾 Newsletter record created with ID: ${newsletter._id}`);

    // Send emails to all subscribers
    const results: SendResult[] = [];
    let sent = 0;
    let failed = 0;

    console.log('📨 Starting email sending...');
    for (let i = 0; i < subscribers.length; i++) {
      const email = subscribers[i];
      console.log(`📨 Sending to ${email} (${i + 1}/${subscribers.length})...`);
      
      const result = await sendToRecipient(email, newsletterData);
      results.push(result);

      if (result.success) {
        sent++;
        console.log(`✅ Sent successfully to ${email}`);
      } else {
        failed++;
        console.log(`❌ Failed to send to ${email}: ${result.error}`);
      }

      // Rate limiting
      if (i < subscribers.length - 1) {
        await delay(CONFIG.RATE_LIMIT_DELAY);
      }
    }

    // Update newsletter record
    newsletter.status = 'sent';
    newsletter.sentTo = sent;
    newsletter.sentAt = new Date();
    await newsletter.save();

    console.log(`✅ Newsletter send complete! Total: ${subscribers.length}, Sent: ${sent}, Failed: ${failed}`);

    return {
      total: subscribers.length,
      sent,
      failed,
      results,
      newsletterId: newsletter._id.toString(),
    };
  } catch (error) {
    console.error('❌ Error in sendNewsletterToAll:', error);
    throw error;
  }
}

export async function sendTestNewsletter(recipientEmail: string): Promise<SendResult> {
  try {
    console.log(`🧪 Sending test newsletter to ${recipientEmail}...`);
    
    // Import Article model dynamically
    const Article = (await import('../models/Article')).default;
    
    // Fetch top 5 ranked articles from database
    const topArticles = await Article.find({ 
      rank: { $exists: true, $ne: null } 
    })
      .sort({ rank: 1 })
      .limit(CONFIG.TOP_ARTICLES_COUNT);

    console.log(`📊 Found ${topArticles.length} ranked articles for test email`);

    if (!topArticles || topArticles.length === 0) {
      console.log('⚠️ No ranked articles found for test!');
      throw new Error('No ranked articles found. Run the workflow first to scrape and score articles.');
    }

    // Create newsletter data structure
    const newsletterData: NewsletterData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedDate: new Date().toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        totalScraped: topArticles.length,
        topSelected: CONFIG.TOP_ARTICLES_COUNT,
        poweredBy: 'ArchWeekly AI'
      },
      topArticles: topArticles.map(article => ({
        rank: article.rank || 0,
        title: article.title,
        url: article.url,
        source: article.source,
        description: article.description || article.reasoning || '',
        score: article.score || 0,
        category: article.category || 'General',
        reasoning: article.reasoning || '',
        keyInsights: article.keyInsights || []
      }))
    };

    console.log('📝 Test newsletter data prepared');

    // Send test email
    const result = await sendToRecipient(recipientEmail, newsletterData);
    
    if (result.success) {
      console.log(`✅ Test email sent successfully to ${recipientEmail}`);
    } else {
      console.log(`❌ Test email failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('❌ Error in sendTestNewsletter:', error);
    throw error;
  }
}