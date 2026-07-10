import { FilterQuery } from 'mongoose';
import { Category } from '../../models/Category';
import { Expense, ExpenseDocument, IExpense } from '../../models/Expense';
import { AppError } from '../../utils/AppError';
import { toMinorUnits } from '../../utils/money';
import { ExpenseResponse, serializeExpense } from './expenses.serializer';
import type { CreateExpenseInput, ListExpensesQuery, UpdateExpenseInput } from './expenses.schema';

/** Ensure the category exists AND belongs to the caller before linking an expense to it. */
async function assertCategoryOwned(userId: string, categoryId: string): Promise<void> {
  const exists = await Category.exists({ _id: categoryId, user: userId });
  if (!exists) throw AppError.validation('categoryId does not reference one of your categories');
}

export async function createExpense(
  userId: string,
  input: CreateExpenseInput,
): Promise<ExpenseResponse> {
  await assertCategoryOwned(userId, input.categoryId);

  const expense = await Expense.create({
    user: userId,
    category: input.categoryId,
    amount: toMinorUnits(input.amount),
    currency: input.currency ?? 'USD',
    description: input.description,
    date: input.date ?? new Date(),
  });

  await expense.populate('category', 'name color');
  return serializeExpense(expense);
}

export interface PaginatedExpenses {
  data: ExpenseResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listExpenses(
  userId: string,
  query: ListExpensesQuery,
): Promise<PaginatedExpenses> {
  const filter: FilterQuery<IExpense> = { user: userId };

  // Date range on the spend date (inclusive).
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = query.from;
    if (query.to) filter.date.$lte = query.to;
  }

  if (query.categoryId) filter.category = query.categoryId;
  if (query.currency) filter.currency = query.currency;

  // Amount range — convert the major-unit query values to cents to match storage.
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) filter.amount.$gte = Math.round(query.minAmount * 100);
    if (query.maxAmount !== undefined) filter.amount.$lte = Math.round(query.maxAmount * 100);
  }

  // Case-insensitive substring match on description. Escaped so user input can't
  // inject regex metacharacters.
  if (query.q) {
    filter.description = { $regex: escapeRegex(query.q), $options: 'i' };
  }

  const sort: Record<string, 1 | -1> = { [query.sort]: query.order === 'asc' ? 1 : -1 };
  const skip = (query.page - 1) * query.limit;

  // Run the page query and the total count in parallel.
  const [docs, total] = await Promise.all([
    Expense.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .populate('category', 'name color'),
    Expense.countDocuments(filter),
  ]);

  return {
    data: docs.map(serializeExpense),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getExpense(userId: string, id: string): Promise<ExpenseResponse> {
  const expense = await findOwned(userId, id);
  await expense.populate('category', 'name color');
  return serializeExpense(expense);
}

export async function updateExpense(
  userId: string,
  id: string,
  patch: UpdateExpenseInput,
): Promise<ExpenseResponse> {
  if (patch.categoryId) await assertCategoryOwned(userId, patch.categoryId);

  const update: Partial<IExpense> = {};
  if (patch.amount !== undefined) update.amount = toMinorUnits(patch.amount);
  if (patch.categoryId !== undefined) update.category = patch.categoryId as unknown as IExpense['category'];
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.date !== undefined) update.date = patch.date;
  if (patch.currency !== undefined) update.currency = patch.currency;

  const expense = await Expense.findOneAndUpdate({ _id: id, user: userId }, update, {
    new: true,
    runValidators: true,
  }).populate('category', 'name color');

  if (!expense) throw AppError.notFound('Expense not found');
  return serializeExpense(expense);
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const result = await Expense.findOneAndDelete({ _id: id, user: userId });
  if (!result) throw AppError.notFound('Expense not found');
}

async function findOwned(userId: string, id: string): Promise<ExpenseDocument> {
  const expense = await Expense.findOne({ _id: id, user: userId });
  if (!expense) throw AppError.notFound('Expense not found');
  return expense;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
