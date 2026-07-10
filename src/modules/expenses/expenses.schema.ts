import { z } from 'zod';
import { objectId } from '../../utils/zod';

// A positive money amount in MAJOR units (e.g. 19.99) with at most 2 decimals.
const amount = z
  .number()
  .positive('amount must be greater than 0')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9, {
    message: 'amount must have at most 2 decimal places',
  });

const currency = z
  .string()
  .length(3)
  .transform((s) => s.toUpperCase());

export const createExpenseSchema = z.object({
  amount,
  categoryId: objectId,
  description: z.string().max(500).optional(),
  date: z.coerce.date().optional(),
  currency: currency.optional(),
});

export const updateExpenseSchema = z
  .object({
    amount: amount.optional(),
    categoryId: objectId.optional(),
    description: z.string().max(500).optional(),
    date: z.coerce.date().optional(),
    currency: currency.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

// Query params arrive as strings; z.coerce turns them into numbers/dates and we
// apply sensible defaults + caps (limit is capped at 100 to protect the DB).
export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  categoryId: objectId.optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  q: z.string().max(200).optional(),
  currency: currency.optional(),
  sort: z.enum(['date', 'amount', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
