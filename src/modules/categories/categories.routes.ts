import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { idParamSchema } from '../../utils/zod';
import { createCategorySchema, updateCategorySchema } from './categories.schema';
import * as categoriesController from './categories.controller';

const router = Router();

// Every category route requires a logged-in user.
router.use(authenticate);

router.post('/', validate({ body: createCategorySchema }), categoriesController.create);
router.get('/', categoriesController.list);
router.get('/:id', validate({ params: idParamSchema }), categoriesController.getOne);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCategorySchema }),
  categoriesController.update,
);
router.delete('/:id', validate({ params: idParamSchema }), categoriesController.remove);

export default router;
