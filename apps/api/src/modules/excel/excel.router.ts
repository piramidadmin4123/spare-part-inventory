import { Router } from 'express';
import type { Router as IRouter } from 'express';

export const excelRouter: IRouter = Router();

// Implemented in Phase 6
excelRouter.post('/import', (_req, res) => res.status(501).json({ message: 'Coming in Phase 6' }));
excelRouter.get('/export', (_req, res) => res.status(501).json({ message: 'Coming in Phase 6' }));
excelRouter.get('/template', (_req, res) => res.status(501).json({ message: 'Coming in Phase 6' }));
