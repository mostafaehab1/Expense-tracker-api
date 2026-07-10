import { AppError } from './AppError';

/**
 * Money is stored as an integer number of minor units (cents) to avoid
 * floating-point rounding bugs. These helpers convert at the API boundary:
 * the outside world speaks major units (19.99), the database speaks cents (1999).
 */

/** 19.99 -> 1999. Rejects more than 2 decimal places or non-finite input. */
export function toMinorUnits(major: number): number {
  if (!Number.isFinite(major)) {
    throw AppError.validation('amount must be a finite number');
  }
  // Round to 2 dp first to absorb representation noise (e.g. 19.99 * 100 = 1998.9999…).
  const cents = Math.round(major * 100);
  if (Math.abs(cents / 100 - major) > 1e-9) {
    throw AppError.validation('amount must have at most 2 decimal places');
  }
  return cents;
}

/** 1999 -> 19.99. */
export function toMajorUnits(minor: number): number {
  return Math.round(minor) / 100;
}
