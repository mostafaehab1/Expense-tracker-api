import { ExpenseDocument } from '../../models/Expense';
import { toMajorUnits } from '../../utils/money';

interface PopulatedCategory {
  _id: unknown;
  name: string;
  color?: string;
}

export interface ExpenseResponse {
  id: string;
  amount: number; // major units
  currency: string;
  description?: string;
  date: Date;
  categoryId: string;
  category?: { id: string; name: string; color?: string };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert a stored expense (amount in cents, category as ref or populated doc)
 * into the public API shape (amount in major units). Every expense leaving the
 * API goes through here so the cents-internally rule is never violated.
 */
export function serializeExpense(doc: ExpenseDocument): ExpenseResponse {
  const category = doc.category as unknown;
  const isPopulated =
    category !== null && typeof category === 'object' && 'name' in (category as object);

  const categoryId = isPopulated ? String((category as PopulatedCategory)._id) : String(category);

  return {
    id: doc.id,
    amount: toMajorUnits(doc.amount),
    currency: doc.currency,
    description: doc.description,
    date: doc.date,
    categoryId,
    category: isPopulated
      ? {
          id: categoryId,
          name: (category as PopulatedCategory).name,
          color: (category as PopulatedCategory).color,
        }
      : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
