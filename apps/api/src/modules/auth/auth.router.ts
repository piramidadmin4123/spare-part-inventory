import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { loginSchema, registerSchema, updateProfileSchema } from '@spare-part/shared';
import { requireAuth } from '../../middleware/auth.js';
import * as authService from './auth.service.js';

export const authRouter: IRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user!.id, input);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
