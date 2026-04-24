import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.router.js';
import { sitesRouter } from './modules/sites/sites.router.js';
import { equipmentTypesRouter } from './modules/equipment-types/equipment-types.router.js';
import { brandsRouter } from './modules/brands/brands.router.js';
import { inventoryRouter } from './modules/inventory/inventory.router.js';
import { borrowRouter } from './modules/borrow/borrow.router.js';
import { excelRouter } from './modules/excel/excel.router.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';
import { additionalOrdersRouter } from './modules/additional-orders/additional-orders.router.js';
import { usersRouter } from './modules/users/users.router.js';

const app: Express = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/auth', authRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/equipment-types', equipmentTypesRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/spare-parts', inventoryRouter);
app.use('/api/borrow', borrowRouter);
app.use('/api/excel', excelRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/additional-orders', additionalOrdersRouter);
app.use('/api/users', usersRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
