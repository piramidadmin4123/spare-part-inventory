import { Router } from 'express';
import type { Router as IRouter } from 'express';

export const inventoryRouter: IRouter = Router();

// Implemented in Phase 4
inventoryRouter.get('/', (_req, res) => res.status(501).json({ message: 'Coming in Phase 4' }));
