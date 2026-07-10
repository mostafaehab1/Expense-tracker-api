import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as reportsService from './reports.service';
import type { BudgetVsActualQuery, ByCategoryQuery, MonthlyQuery } from './reports.schema';

export const monthly = asyncHandler(async (req: Request, res: Response) => {
  const data = await reportsService.monthlyTotals(
    req.userId!,
    req.query as unknown as MonthlyQuery,
  );
  res.status(200).json({ data });
});

export const byCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await reportsService.byCategory(
    req.userId!,
    req.query as unknown as ByCategoryQuery,
  );
  res.status(200).json({ data });
});

export const budgetVsActual = asyncHandler(async (req: Request, res: Response) => {
  const data = await reportsService.budgetVsActual(
    req.userId!,
    req.query as unknown as BudgetVsActualQuery,
  );
  res.status(200).json({ data });
});
