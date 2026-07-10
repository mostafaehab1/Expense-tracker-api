import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as budgetsService from './budgets.service';
import type { ListBudgetsQuery } from './budgets.schema';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetsService.createBudget(req.userId!, req.body);
  res.status(201).json(budget);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const budgets = await budgetsService.listBudgets(
    req.userId!,
    req.query as unknown as ListBudgetsQuery,
  );
  res.status(200).json({ data: budgets });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetsService.updateBudget(req.userId!, req.params.id, req.body);
  res.status(200).json(budget);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await budgetsService.deleteBudget(req.userId!, req.params.id);
  res.status(204).send();
});
