import { z } from 'zod';

const currency = z
  .string()
  .length(3)
  .transform((s) => s.toUpperCase())
  .default('USD');

export const monthlyQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1970)
    .max(9999)
    .default(() => new Date().getUTCFullYear()),
  currency,
});

export const byCategoryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  currency,
});

export const budgetVsActualQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format'),
  currency,
});

export type MonthlyQuery = z.infer<typeof monthlyQuerySchema>;
export type ByCategoryQuery = z.infer<typeof byCategoryQuerySchema>;
export type BudgetVsActualQuery = z.infer<typeof budgetVsActualQuerySchema>;
