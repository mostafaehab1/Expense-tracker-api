import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { PublicUser, toPublicUser, User } from '../../models/User';
import type { LoginInput, RegisterInput } from './auth.schema';

interface AuthResult {
  user: PublicUser;
  token: string;
}

/** Sign a short-lived access token carrying the user id as `sub`. */
function issueToken(userId: string): string {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId }, env.JWT_SECRET, options);
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  try {
    const user = await User.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    return { user: toPublicUser(user), token: issueToken(user.id) };
  } catch (err) {
    // The unique index on email is the source of truth. Translate its duplicate
    // -> a friendly 409 rather than a raw Mongo error.
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('An account with that email already exists');
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  // passwordHash is `select: false`, so we must ask for it explicitly here.
  const user = await User.findOne({ email: input.email }).select('+passwordHash');

  // Use the SAME error whether the email is unknown or the password is wrong, so
  // an attacker can't probe which emails are registered.
  const invalid = AppError.unauthenticated('Invalid email or password');
  if (!user) {
    // Still run a hash compare on a dummy value to keep timing roughly constant.
    await bcrypt.compare(input.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv');
    throw invalid;
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw invalid;

  return { user: toPublicUser(user), token: issueToken(user.id) };
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return toPublicUser(user);
}
