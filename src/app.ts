import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { AppError } from './utils/AppError';
import { errorHandler } from './middleware/errorHandler';
import { openapiDocument } from './docs/openapi';

import authRoutes from './modules/auth/auth.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import budgetsRoutes from './modules/budgets/budgets.routes';
import reportsRoutes from './modules/reports/reports.routes';

/**
 * Builds the Express application WITHOUT starting a server. Keeping `listen()`
 * out of here means tests can import the app and drive it in-process with
 * Supertest — no ports, no race conditions.
 */
export function createApp(): Express {
  const app = express();

  // Security + parsing middleware.
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Liveness probe (used by Docker/Fly health checks).
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Interactive API docs.
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  // Versioned API surface.
  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/categories', categoriesRoutes);
  api.use('/expenses', expensesRoutes);
  api.use('/budgets', budgetsRoutes);
  api.use('/reports', reportsRoutes);
  app.use('/api/v1', api);

  // Unknown route -> consistent 404 through the error handler.
  app.use((req: Request, _res: Response) => {
    throw AppError.notFound(`Route ${req.method} ${req.path} not found`);
  });

  // Central error handler is mounted LAST so everything funnels through it.
  app.use(errorHandler);

  return app;
}
