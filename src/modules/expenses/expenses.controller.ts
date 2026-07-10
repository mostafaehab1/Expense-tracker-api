import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as expensesService from './expenses.service';
import type { ListExpensesQuery } from './expenses.schema';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expensesService.createExpense(req.userId!, req.body);
  res.status(201).json(expense);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  // The validate middleware has already parsed + defaulted the query.
  const result = await expensesService.listExpenses(
    req.userId!,
    req.query as unknown as ListExpensesQuery,
  );
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expensesService.getExpense(req.userId!, req.params.id);
  res.status(200).json(expense);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expensesService.updateExpense(req.userId!, req.params.id, req.body);
  res.status(200).json(expense);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await expensesService.deleteExpense(req.userId!, req.params.id);
  res.status(204).send();
});
