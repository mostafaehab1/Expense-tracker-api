import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'color must be a hex code like #FF8800');

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: hexColor.optional(),
});

// `.strict()` rejects unknown keys; `.refine` ensures at least one field is sent
// so an empty PATCH is a clear 400 rather than a silent no-op.
export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    color: hexColor.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
