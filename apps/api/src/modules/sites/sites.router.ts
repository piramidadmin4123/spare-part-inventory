import { Router } from 'express';
import type { Router as IRouter } from 'express';

export const sitesRouter: IRouter = Router();

// Implemented in Phase 3
sitesRouter.get('/', (_req, res) => res.status(501).json({ message: 'Coming in Phase 3' }));
