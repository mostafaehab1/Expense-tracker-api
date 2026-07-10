import { Category, CategoryDocument } from '../../models/Category';
import { Expense } from '../../models/Expense';
import { AppError } from '../../utils/AppError';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoryDocument> {
  try {
    return await Category.create({ ...input, user: userId });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict(`You already have a category named "${input.name}"`);
    }
    throw err;
  }
}

export async function listCategories(userId: string): Promise<CategoryDocument[]> {
  return Category.find({ user: userId }).sort({ name: 1 });
}

/**
 * Fetch one category the caller owns. Scoping the query by `user` is how we
 * enforce isolation: another user's id simply yields "not found".
 */
export async function getCategory(userId: string, id: string): Promise<CategoryDocument> {
  const category = await Category.findOne({ _id: id, user: userId });
  if (!category) throw AppError.notFound('Category not found');
  return category;
}

export async function updateCategory(
  userId: string,
  id: string,
  patch: UpdateCategoryInput,
): Promise<CategoryDocument> {
  try {
    const category = await Category.findOneAndUpdate({ _id: id, user: userId }, patch, {
      new: true,
      runValidators: true,
    });
    if (!category) throw AppError.notFound('Category not found');
    return category;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('You already have a category with that name');
    }
    throw err;
  }
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  // Decision (SPEC §8.3): block deletion while expenses reference the category,
  // rather than orphaning or cascade-deleting the user's spend history.
  const inUse = await Expense.countDocuments({ user: userId, category: id });
  if (inUse > 0) {
    throw AppError.conflict(
      `Cannot delete: ${inUse} expense(s) still use this category. Reassign or delete them first.`,
    );
  }

  const result = await Category.findOneAndDelete({ _id: id, user: userId });
  if (!result) throw AppError.notFound('Category not found');
}
