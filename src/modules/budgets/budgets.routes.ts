import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { idParamSchema } from '../../utils/zod';
import {
  createBudgetSchema,
  listBudgetsQuerySchema,
  updateBudgetSchema,
} from './budgets.schema';
import * as budgetsController from './budgets.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createBudgetSchema }), budgetsController.create);
router.get('/', validate({ query: listBudgetsQuerySchema }), budgetsController.list);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateBudgetSchema }),
  budgetsController.update,
);
router.delete('/:id', validate({ params: idParamSchema }), budgetsController.remove);

export default router;
