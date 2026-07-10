import { HydratedDocument, model, Schema, Types } from 'mongoose';
import { toJSONPlugin } from './plugins';

export interface ICategory {
  user: Types.ObjectId;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<ICategory>;

const categorySchema = new Schema<ICategory>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, trim: true },
  },
  { timestamps: true },
);

// A user cannot have two categories with the same name, but different users can
// both have "Food". The compound unique index enforces this at the DB level.
categorySchema.index({ user: 1, name: 1 }, { unique: true });

categorySchema.plugin(toJSONPlugin);

export const Category = model<ICategory>('Category', categorySchema);
