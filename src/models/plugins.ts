import { Schema } from 'mongoose';

/**
 * Applied to every schema. When a document is converted to JSON we:
 *  - expose `id` instead of the raw `_id` ObjectId,
 *  - drop Mongoose's internal `__v` version key,
 *  - hard-strip `passwordHash` as a safety net so a hash can never leak, even
 *    if a controller forgets to select it out.
 */
export function toJSONPlugin(schema: Schema): void {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  });
}
