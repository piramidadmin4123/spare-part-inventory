import { Router } from 'express';
import type { Router as IRouter } from 'express';

export const borrowRouter: IRouter = Router();

// Implemented in Phase 5
borrowRouter.get('/', (_req, res) => res.status(501).json({ message: 'Coming in Phase 5' }));
