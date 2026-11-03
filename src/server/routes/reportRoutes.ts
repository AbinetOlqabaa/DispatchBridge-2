import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Executive Analytics & Performance Report
router.get('/analytics', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const report = await sandboxStore.getAnalyticsReport(user.businessId, user);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
