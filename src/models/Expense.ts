import { HydratedDocument, model, Schema, Types } from 'mongoose';
import { toJSONPlugin } from './plugins';

export interface IExpense {
  user: Types.ObjectId;
  category: Types.ObjectId;
  amount: number; // integer minor units (cents)
  currency: string; // ISO 4217, e.g. "USD"
  description?: string;
  date: Date; // when the spend happened
  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseDocument = HydratedDocument<IExpense>;

const expenseSchema = new Schema<IExpense>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: {
      type: Number,
      required: true,
      min: 1, // stored in cents, must be positive
      validate: {
        validator: Number.isInteger,
        message: 'amount (cents) must be an integer',
      },
    },
    currency: { type: String, required: true, uppercase: true, default: 'USD', minlength: 3, maxlength: 3 },
    description: { type: String, trim: true },
    date: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

// Indexes matching our query patterns: date-range + sort, and category filtering.
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });

expenseSchema.plugin(toJSONPlugin);

export const Expense = model<IExpense>('Expense', expenseSchema);
