//src/controllers/newsletterSenderController.ts
import { Request, Response } from 'express';
import { sendNewsletterToAll, sendTestNewsletter } from '../services/newsletter-sender';
import { triggerNewsletterManually } from '../services/scheduler';

export const broadcastNewsletter = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

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
    res.status(500).json({ 
      error: 'An error occurred while broadcasting newsletter',
    });
  }
};

export const triggerNewsletter = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const result = await triggerNewsletterManually();

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
    res.status(500).json({ 
      error: 'An error occurred during newsletter workflow',
    });
  }
};

export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { email } = req.body;
    const testEmail = email || user.email;

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
      });
    }

  } catch (error) {
    res.status(500).json({ 
      error: 'An error occurred while sending test email',
    });
  }
};