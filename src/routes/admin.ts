//src/routes/admin.ts
import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { triggerSystemDesignUpdateManually } from '../services/system-design-updater';

const router = express.Router();

/**
 * Manual trigger for System Design resource update
 * POST /api/admin/trigger-system-design-update
 * Requires: Admin authentication
 */
router.post(
  '/trigger-system-design-update',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      console.log('\n🔧 MANUAL TRIGGER: System Design Update Started\n');
      
      // Run the update and WAIT for completion
      const result = await triggerSystemDesignUpdateManually();
      
      console.log('\n✅ System Design update completed successfully');
      console.log(`📦 Total resources processed: ${result?.length || 0}\n`);
      
      // Return success response with data
      res.json({
        success: true,
        message: 'System Design update completed successfully',
        total: result?.length || 0,
      });

    } catch (error) {
      console.error('\n❌ System Design update failed:', error);
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to complete System Design update',
      });
    }
  }
);

export default router;