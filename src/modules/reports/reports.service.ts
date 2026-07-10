import { Types } from 'mongoose';
import { Expense } from '../../models/Expense';
import { Budget } from '../../models/Budget';
import { toMajorUnits } from '../../utils/money';
import type { BudgetVsActualQuery, ByCategoryQuery, MonthlyQuery } from './reports.schema';

/**
 * These reports are computed with MongoDB aggregation pipelines — the database
 * does the grouping/summing/joining, and we never pull raw rows into Node to
 * loop over them. All amounts are summed in cents inside Mongo and converted to
 * major units once, at the edge.
 *
 * All queries are pinned to a single currency because v1 does no FX conversion
 * (SPEC §7.4): summing mixed currencies would be meaningless.
 */

/** Total spend for each of the 12 months of a year. */
export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  total: number; // major units
}

export async function monthlyTotals(userId: string, query: MonthlyQuery): Promise<MonthlyTotal[]> {
  const start = new Date(Date.UTC(query.year, 0, 1));
  const end = new Date(Date.UTC(query.year + 1, 0, 1));

  const rows = await Expense.aggregate<{ _id: number; total: number }>([
    {
      $match: {
        user: new Types.ObjectId(userId),
        currency: query.currency,
        date: { $gte: start, $lt: end },
      },
    },
    // Group by calendar month (1-12), pinned to UTC so results are deterministic.
    {
      $group: {
        _id: { $month: { date: '$date', timezone: 'UTC' } },
        total: { $sum: '$amount' },
      },
    },
  ]);

  // The aggregation only returns months that HAVE spend. Fill the gaps so the
  // response is a clean, ordered 12-item series (0 for empty months).
  const byMonth = new Map(rows.map((r) => [r._id, r.total]));
  return Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const cents = byMonth.get(monthNum) ?? 0;
    return {
      month: `${query.year}-${String(monthNum).padStart(2, '0')}`,
      total: toMajorUnits(cents),
    };
  });
}

/** Spend grouped by category over an optional date range, sorted high to low. */
export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  total: number; // major units
  count: number;
}

export async function byCategory(
  userId: string,
  query: ByCategoryQuery,
): Promise<CategoryBreakdown[]> {
  const match: Record<string, unknown> = {
    user: new Types.ObjectId(userId),
    currency: query.currency,
  };
  if (query.from || query.to) {
    const date: Record<string, Date> = {};
    if (query.from) date.$gte = query.from;
    if (query.to) date.$lte = query.to;
    match.date = date;
  }

  const rows = await Expense.aggregate<{
    _id: Types.ObjectId;
    total: number;
    count: number;
    category: { name: string }[];
  }>([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    // Join the category document to get its display name.
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $sort: { total: -1 } },
  ]);

  return rows.map((r) => ({
    categoryId: r._id.toString(),
    name: r.category[0]?.name ?? '(deleted category)',
    total: toMajorUnits(r.total),
    count: r.count,
  }));
}

/**
 * Budget vs. actual for one month: for every budget the user set that month,
 * sum the matching expenses and compute how much is left / % used. This is the
 * hardest pipeline — it starts from budgets and $lookups a *filtered, summed*
 * slice of expenses via a sub-pipeline.
 */
export interface BudgetVsActualRow {
  categoryId: string;
  name: string;
  budget: number; // major units
  actual: number; // major units
  remaining: number; // major units (can be negative = over budget)
  percentUsed: number; // 0..N, rounded to 1 dp
}

export async function budgetVsActual(
  userId: string,
  query: BudgetVsActualQuery,
): Promise<BudgetVsActualRow[]> {
  const user = new Types.ObjectId(userId);
  const [yearStr, monthStr] = query.month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));

  const rows = await Budget.aggregate<{
    _id: Types.ObjectId;
    category: Types.ObjectId;
    amount: number;
    actual: number;
    categoryDoc: { name: string }[];
  }>([
    { $match: { user, month: query.month, currency: query.currency } },
    // For each budget, pull the summed expense total for the same category,
    // currency, and month window — all inside the DB.
    {
      $lookup: {
        from: 'expenses',
        let: { cat: '$category' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$user', user] },
                  { $eq: ['$category', '$$cat'] },
                  { $eq: ['$currency', query.currency] },
                  { $gte: ['$date', monthStart] },
                  { $lt: ['$date', monthEnd] },
                ],
              },
            },
          },
          { $group: { _id: null, spent: { $sum: '$amount' } } },
        ],
        as: 'spentAgg',
      },
    },
    // Flatten the single summed value (or 0 if no expenses matched).
    {
      $addFields: {
        actual: { $ifNull: [{ $first: '$spentAgg.spent' }, 0] },
      },
    },
    // Join category name for the response.
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $sort: { amount: -1 } },
  ]);

  return rows.map((r) => {
    const budget = toMajorUnits(r.amount);
    const actual = toMajorUnits(r.actual);
    const remaining = toMajorUnits(r.amount - r.actual);
    const percentUsed = r.amount === 0 ? 0 : Math.round((r.actual / r.amount) * 1000) / 10;
    return {
      categoryId: r.category.toString(),
      name: r.categoryDoc[0]?.name ?? '(deleted category)',
      budget,
      actual,
      remaining,
      percentUsed,
    };
  });
}
