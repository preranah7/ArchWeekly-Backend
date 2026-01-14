//src/routes/admin.ts
import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { triggerSystemDesignUpdateManually } from '../services/system-design-updater';

const router = express.Router();

router.post(
  '/trigger-system-design-update',
  authMiddleware,
  adminOnly,
  asyncHandler(async (req, res) => {
    const result = await triggerSystemDesignUpdateManually();
    
    res.json({
      success: true,
      message: 'System Design update completed successfully',
      total: result?.length || 0,
    });
  })
);

export default router;