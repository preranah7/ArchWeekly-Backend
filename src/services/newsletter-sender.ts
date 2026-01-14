import { Resend } from 'resend';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import User from '../models/User';
import Newsletter from '../models/Newsletter';
import Subscriber from '../models/Subscriber';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const { metadata, topArticles } = data;
  
  // Take only top 5 articles
  const topFive = topArticles.slice(0, 5);
  
  // Generate article cards - clean, minimal style
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

  // Create unsubscribe link
  const unsubscribeUrl = `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`;

  // Full email HTML - clean and professional
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
            <h1>ScaleWeekly</h1>
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
              ScaleWeekly curates the best technical content from High Scalability, Pragmatic Engineer, Cloudflare, AWS, and developer communities. Each week we select articles that deepen your understanding of building resilient, scalable systems.
            </p>
          </div>
          
          <div class="footer">
            <p>Questions or feedback? <a href="mailto:support@scaleweekly.com">Let us know</a></p>
            <p style="margin-top: 16px;">
              <a href="${unsubscribeUrl}">Unsubscribe</a> · <a href="${process.env.FRONTEND_URL}">View in browser</a>
            </p>
            <p style="margin-top: 16px; opacity: 0.7;">
              ScaleWeekly | ${new Date().getFullYear()}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Helper function to delay between sends (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send newsletter to a single recipient
 */
async function sendToRecipient(
  email: string, 
  newsletterData: NewsletterData
): Promise<SendResult> {
  try {
    const html = generateNewsletterHTML(newsletterData, email);

    const { data, error } = await resend.emails.send({
      from: 'ScaleWeekly <onboarding@resend.dev>',
      to: email,
      subject: `ScaleWeekly: This Week's Top Articles`,
      html: html,
    });

    if (error) {
      console.error(`❌ Failed to send to ${email}:`, error);
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
    return {
      email,
      success: false,
      error: err.message,
    };
  }
}

/**
 * Get all active subscribers (from both User and Subscriber models)
 */
async function getAllActiveSubscribers(): Promise<string[]> {
  try {
    // Get verified users who want newsletters
    const users = await User.find({ isVerified: true }).select('email');
    const userEmails = users.map(u => u.email);

    // Get active subscribers
    const subscribers = await Subscriber.find({ isActive: true }).select('email');
    const subscriberEmails = subscribers.map(s => s.email);

    // Combine and deduplicate
    const allEmails = [...new Set([...userEmails, ...subscriberEmails])];
    
    return allEmails;
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    throw error;
  }
}

/**
 * Send newsletter to all active subscribers
 */
export async function sendNewsletterToAll(): Promise<{
  total: number;
  sent: number;
  failed: number;
  results: SendResult[];
  newsletterId?: string;
}> {
  console.log('\n' + '='.repeat(60));
  console.log('📧 NEWSLETTER BROADCAST STARTING');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Load newsletter data
    const jsonPath = path.join(process.cwd(), 'scaleweekly-curated.json');
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error('scaleweekly-curated.json not found. Run scraper first.');
    }

    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const newsletterData: NewsletterData = JSON.parse(jsonData);

    console.log(`✓ Loaded articles from ${newsletterData.metadata.generatedDate}`);
    console.log(`✓ Top 5 articles selected\n`);

    // 2. Get all active subscribers
    const subscribers = await getAllActiveSubscribers();
    
    if (subscribers.length === 0) {
      console.log('⚠️  No active subscribers found.\n');
      return {
        total: 0,
        sent: 0,
        failed: 0,
        results: [],
      };
    }

    console.log(`📬 Found ${subscribers.length} active subscribers`);
    console.log(`⏱️  Starting broadcast...\n`);

    // 3. Save newsletter to database BEFORE sending
    const newsletter = new Newsletter({
      title: `ScaleWeekly - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      date: new Date(),
      articles: newsletterData.topArticles.slice(0, 5).map((article, index) => ({
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
    console.log(`✓ Newsletter saved to DB (ID: ${newsletter._id})\n`);

    // 4. Send to all subscribers with rate limiting
    const results: SendResult[] = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < subscribers.length; i++) {
      const email = subscribers[i];
      
      console.log(`[${i + 1}/${subscribers.length}] Sending to ${email}...`);
      
      const result = await sendToRecipient(email, newsletterData);
      results.push(result);

      if (result.success) {
        sent++;
        console.log(`  ✅ Sent (ID: ${result.emailId})`);
      } else {
        failed++;
        console.log(`  ❌ Failed: ${result.error}`);
      }

      // Rate limiting: Wait 100ms between sends (Resend allows 10 req/sec)
      if (i < subscribers.length - 1) {
        await delay(100);
      }
    }

    // 5. Update newsletter status in DB
    newsletter.status = 'sent';
    newsletter.sentTo = sent;
    newsletter.sentAt = new Date();
    await newsletter.save();

    console.log(`✓ Newsletter marked as sent in DB\n`);

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BROADCAST COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📬 Total: ${subscribers.length}`);
    console.log(`💾 Newsletter ID: ${newsletter._id}`);
    console.log('='.repeat(60) + '\n');

    return {
      total: subscribers.length,
      sent,
      failed,
      results,
      newsletterId: newsletter._id.toString(),
    };

  } catch (error) {
    console.error('❌ Newsletter broadcast failed:', error);
    throw error;
  }
}

/**
 * Send test newsletter to a single email (for testing)
 */
export async function sendTestNewsletter(recipientEmail: string): Promise<SendResult> {
  console.log('\n📧 Sending test newsletter...\n');

  try {
    const jsonPath = path.join(process.cwd(), 'scaleweekly-curated.json');
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error('scaleweekly-curated.json not found');
    }

    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const newsletterData: NewsletterData = JSON.parse(jsonData);

    console.log(`✓ Loaded articles from ${newsletterData.metadata.generatedDate}`);
    
    const result = await sendToRecipient(recipientEmail, newsletterData);

    if (result.success) {
      console.log(`✅ Test email sent to ${recipientEmail}`);
      console.log(`📧 Email ID: ${result.emailId}\n`);
    } else {
      console.log(`❌ Failed to send: ${result.error}\n`);
    }

    return result;
  } catch (error) {
    console.error('Failed:', error);
    throw error;
  }
}
