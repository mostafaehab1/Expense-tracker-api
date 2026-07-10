import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  budgetVsActualQuerySchema,
  byCategoryQuerySchema,
  monthlyQuerySchema,
} from './reports.schema';
import * as reportsController from './reports.controller';

const router = Router();

router.use(authenticate);

router.get('/monthly', validate({ query: monthlyQuerySchema }), reportsController.monthly);
router.get(
  '/by-category',
  validate({ query: byCategoryQuerySchema }),
  reportsController.byCategory,
);
router.get(
  '/budget-vs-actual',
  validate({ query: budgetVsActualQuerySchema }),
  reportsController.budgetVsActual,
);

export default router;
