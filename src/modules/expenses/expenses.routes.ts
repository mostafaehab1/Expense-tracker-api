import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { idParamSchema } from '../../utils/zod';
import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from './expenses.schema';
import * as expensesController from './expenses.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createExpenseSchema }), expensesController.create);
router.get('/', validate({ query: listExpensesQuerySchema }), expensesController.list);
router.get('/:id', validate({ params: idParamSchema }), expensesController.getOne);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateExpenseSchema }),
  expensesController.update,
);
router.delete('/:id', validate({ params: idParamSchema }), expensesController.remove);

export default router;
