import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.router.js';
import { sitesRouter } from './modules/sites/sites.router.js';
import { inventoryRouter } from './modules/inventory/inventory.router.js';
import { borrowRouter } from './modules/borrow/borrow.router.js';
import { excelRouter } from './modules/excel/excel.router.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';

const app: Express = express();
const PORT = process.env.PORT ?? 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/spare-parts', inventoryRouter);
app.use('/api/borrow', borrowRouter);
app.use('/api/excel', excelRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.info(`API server running on http://localhost:${PORT}`);
});

export default app;
