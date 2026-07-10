import { Types } from 'mongoose';
import { z } from 'zod';

/** A Zod schema that accepts only a valid MongoDB ObjectId string. */
export const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: 'must be a valid id' });

/** Reusable `:id` path-param schema, shared by every resource's detail routes. */
export const idParamSchema = z.object({ id: objectId });
