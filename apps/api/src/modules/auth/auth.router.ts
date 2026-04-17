import { Router } from 'express';
import type { Router as IRouter } from 'express';

export const authRouter: IRouter = Router();

// Implemented in Phase 2
authRouter.post('/register', (_req, res) => res.status(501).json({ message: 'Coming in Phase 2' }));
authRouter.post('/login', (_req, res) => res.status(501).json({ message: 'Coming in Phase 2' }));
authRouter.post('/logout', (_req, res) => res.status(501).json({ message: 'Coming in Phase 2' }));
authRouter.get('/me', (_req, res) => res.status(501).json({ message: 'Coming in Phase 2' }));
