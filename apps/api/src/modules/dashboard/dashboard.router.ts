import { Router } from 'express';
import type { Router as IRouter } from 'express';

export const dashboardRouter: IRouter = Router();

// Implemented in Phase 7
dashboardRouter.get('/summary', (_req, res) =>
  res.status(501).json({ message: 'Coming in Phase 7' })
);
dashboardRouter.get('/low-stock', (_req, res) =>
  res.status(501).json({ message: 'Coming in Phase 7' })
);
dashboardRouter.get('/recent-borrows', (_req, res) =>
  res.status(501).json({ message: 'Coming in Phase 7' })
);
