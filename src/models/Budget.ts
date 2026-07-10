import { HydratedDocument, model, Schema, Types } from 'mongoose';
import { toJSONPlugin } from './plugins';

export interface IBudget {
  user: Types.ObjectId;
  category: Types.ObjectId;
  month: string; // "YYYY-MM"
  amount: number; // integer minor units (cents)
  currency: string; // ISO 4217
  createdAt: Date;
  updatedAt: Date;
}

export type BudgetDocument = HydratedDocument<IBudget>;

const budgetSchema = new Schema<IBudget>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount (cents) must be an integer' },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'USD',
      minlength: 3,
      maxlength: 3,
    },
  },
  { timestamps: true },
);

// One budget per category per month (per user).
budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

budgetSchema.plugin(toJSONPlugin);

export const Budget = model<IBudget>('Budget', budgetSchema);
