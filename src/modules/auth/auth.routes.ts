import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { isTest } from '../../config/env';
import { loginSchema, registerSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

// Throttle auth endpoints to blunt credential-stuffing / brute force. Disabled
// under test so it never interferes with the suite.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.get('/me', authenticate, authController.me);

export default router;
