import { z } from 'zod';
import { objectId } from '../../utils/zod';

const amount = z
  .number()
  .positive('amount must be greater than 0')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9, {
    message: 'amount must have at most 2 decimal places',
  });

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format');

const currency = z
  .string()
  .length(3)
  .transform((s) => s.toUpperCase());

export const createBudgetSchema = z.object({
  categoryId: objectId,
  month,
  amount,
  currency: currency.optional(),
});

export const updateBudgetSchema = z
  .object({
    amount: amount.optional(),
    currency: currency.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listBudgetsQuerySchema = z.object({
  month: month.optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ListBudgetsQuery = z.infer<typeof listBudgetsQuerySchema>;
