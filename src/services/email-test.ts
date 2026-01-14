import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  console.log('📧 Sending test email...\n');

  try {
    const { data, error } = await resend.emails.send({
      from: 'ScaleWeekly <onboarding@resend.dev>', // Resend's test domain
      to: ['preranahippargi7105@gmail.com'], // ⚠️ CHANGE THIS to YOUR email
      subject: '🎉 ScaleWeekly Test - Your Newsletter System Works!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .article {
                background: white;
                padding: 20px;
                margin: 15px 0;
                border-radius: 8px;
                border-left: 4px solid #667eea;
              }
              .score {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
              }
              a {
                color: #667eea;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🚀 ScaleWeekly Newsletter</h1>
              <p>Your AI-Powered DevOps & System Design Digest</p>
            </div>
            
            <div class="content">
              <h2>✅ Email System Successfully Configured!</h2>
              <p>Congratulations! Your ScaleWeekly newsletter system is now able to send emails.</p>
              
              <h3>📊 Sample Articles (from your scraper):</h3>
              
              <div class="article">
                <span class="score">9/10</span>
                <h4>The Swedbank Outage shows that Change Controls don't work</h4>
                <p>Excellent analysis of a major outage, highlighting the systemic failures of traditional change control.</p>
                <p><strong>Category:</strong> DevOps | <strong>Source:</strong> High Scalability</p>
                <a href="http://highscalability.com" target="_blank">Read Article →</a>
              </div>
              
              <div class="article">
                <span class="score">9/10</span>
                <h4>Lessons Learned Running Presto at Meta Scale</h4>
                <p>Deep insights into operating a complex distributed SQL engine at Meta's immense scale.</p>
                <p><strong>Category:</strong> Scalability | <strong>Source:</strong> High Scalability</p>
                <a href="http://highscalability.com" target="_blank">Read Article →</a>
              </div>
              
              <div class="article">
                <span class="score">9/10</span>
                <h4>Code Orange: Fail Small — Cloudflare's resilience plan</h4>
                <p>Cloudflare's strategic response to recent outages detailing their 'Fail Small' initiative.</p>
                <p><strong>Category:</strong> Site Reliability Engineering | <strong>Source:</strong> Cloudflare</p>
                <a href="https://blog.cloudflare.com" target="_blank">Read Article →</a>
              </div>
              
              <h3>🎯 Next Steps:</h3>
              <ul>
                <li>✅ Resend email service: Working!</li>
                <li>⏳ React Email templates: Next</li>
                <li>⏳ Subscriber management: Coming soon</li>
                <li>⏳ Weekly automation: Coming soon</li>
              </ul>
              
              <p><strong>This is what your subscribers will receive every week!</strong></p>
            </div>
            
            <div class="footer">
              <p>Built with ❤️ by you | Powered by Resend + Gemini AI</p>
              <p>This is a test email from ScaleWeekly development</p>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('📬 Email ID:', data?.id);
    console.log('\n🎉 Check your inbox now!\n');
    console.log('📧 If you don\'t see it in 1-2 minutes:');
    console.log('   1. Check your spam folder');
    console.log('   2. Make sure you changed the "to" email address\n');

  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

// Run the test
sendTestEmail();
