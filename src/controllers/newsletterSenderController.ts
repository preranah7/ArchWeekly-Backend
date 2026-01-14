import { Request, Response } from 'express';
import { sendNewsletterToAll, sendTestNewsletter } from '../services/newsletter-sender';
import { triggerNewsletterManually } from '../services/scheduler';

/**
 * Send newsletter to all subscribers (Admin only)
 * POST /api/newsletters/send
 * Requires: authMiddleware + adminOnly
 */
export const broadcastNewsletter = async (req: Request, res: Response) => {
  try {
    // User is guaranteed to be admin by adminOnly middleware
    const user = req.user!;

    console.log(`\n🔐 Admin ${user.email} triggered newsletter broadcast\n`);

    const result = await sendNewsletterToAll();

    res.json({
      message: 'Newsletter broadcast completed',
      stats: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
      },
      newsletterId: result.newsletterId,
      failedEmails: result.results
        .filter(r => !r.success)
        .map(r => ({ email: r.email, error: r.error })),
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ 
      error: (error as Error).message,
    });
  }
};

/**
 * Trigger complete newsletter workflow (scrape + send)
 * POST /api/newsletters/trigger
 * Requires: authMiddleware + adminOnly
 */
export const triggerNewsletter = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    console.log(`\n🔐 Admin ${user.email} triggered complete newsletter workflow\n`);

    const result = await triggerNewsletterManually();

    // Check if result is undefined (happens when no articles found)
    if (!result) {
      return res.status(400).json({
        error: 'Newsletter workflow completed but no newsletters sent',
        message: 'No articles found or no active subscribers.',
      });
    }

    res.json({
      message: 'Newsletter workflow completed successfully',
      stats: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
      },
      newsletterId: result.newsletterId,
    });

  } catch (error) {
    console.error('Newsletter trigger error:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      message: 'Newsletter workflow failed. Check backend logs for details.',
    });
  }
};


/**
 * Send test newsletter to your own email (Admin only)
 * POST /api/newsletters/test
 * Requires: authMiddleware + adminOnly
 */
export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { email } = req.body;
    const testEmail = email || user.email;

    console.log(`\n🔐 Admin ${user.email} sending test newsletter to ${testEmail}\n`);

    const result = await sendTestNewsletter(testEmail);

    if (result.success) {
      res.json({
        message: 'Test newsletter sent successfully',
        email: testEmail,
        emailId: result.emailId,
      });
    } else {
      res.status(500).json({
        error: 'Failed to send test newsletter',
        details: result.error,
      });
    }

  } catch (error) {
    console.error('Test send error:', error);
    res.status(500).json({ 
      error: (error as Error).message,
    });
  }
};
