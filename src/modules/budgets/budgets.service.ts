import { Budget } from '../../models/Budget';
import { Category } from '../../models/Category';
import { AppError } from '../../utils/AppError';
import { toMinorUnits } from '../../utils/money';
import { BudgetResponse, serializeBudget } from './budgets.serializer';
import type { CreateBudgetInput, ListBudgetsQuery, UpdateBudgetInput } from './budgets.schema';

async function assertCategoryOwned(userId: string, categoryId: string): Promise<void> {
  const exists = await Category.exists({ _id: categoryId, user: userId });
  if (!exists) throw AppError.validation('categoryId does not reference one of your categories');
}

export async function createBudget(
  userId: string,
  input: CreateBudgetInput,
): Promise<BudgetResponse> {
  await assertCategoryOwned(userId, input.categoryId);

  try {
    const budget = await Budget.create({
      user: userId,
      category: input.categoryId,
      month: input.month,
      amount: toMinorUnits(input.amount),
      currency: input.currency ?? 'USD',
    });
    return serializeBudget(budget);
  } catch (err) {
    // Compound unique index (user, category, month) prevents duplicates.
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('A budget for that category and month already exists');
    }
    throw err;
  }
}

export async function listBudgets(
  userId: string,
  query: ListBudgetsQuery,
): Promise<BudgetResponse[]> {
  const filter: Record<string, unknown> = { user: userId };
  if (query.month) filter.month = query.month;

  const budgets = await Budget.find(filter).sort({ month: -1 });
  return budgets.map(serializeBudget);
}

export async function updateBudget(
  userId: string,
  id: string,
  patch: UpdateBudgetInput,
): Promise<BudgetResponse> {
  const update: Record<string, unknown> = {};
  if (patch.amount !== undefined) update.amount = toMinorUnits(patch.amount);
  if (patch.currency !== undefined) update.currency = patch.currency;

  const budget = await Budget.findOneAndUpdate({ _id: id, user: userId }, update, {
    new: true,
    runValidators: true,
  });
  if (!budget) throw AppError.notFound('Budget not found');
  return serializeBudget(budget);
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const result = await Budget.findOneAndDelete({ _id: id, user: userId });
  if (!result) throw AppError.notFound('Budget not found');
}
