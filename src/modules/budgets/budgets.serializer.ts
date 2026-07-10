import { BudgetDocument } from '../../models/Budget';
import { toMajorUnits } from '../../utils/money';

export interface BudgetResponse {
  id: string;
  categoryId: string;
  month: string;
  amount: number; // major units
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeBudget(doc: BudgetDocument): BudgetResponse {
  return {
    id: doc.id,
    categoryId: String(doc.category),
    month: doc.month,
    amount: toMajorUnits(doc.amount),
    currency: doc.currency,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
