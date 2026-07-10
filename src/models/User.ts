import { HydratedDocument, model, Schema, Types } from 'mongoose';
import { toJSONPlugin } from './plugins';

export interface IUser {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // `select: false` means the hash is NOT returned by default queries; a
    // caller must explicitly `.select('+passwordHash')` (only the login flow does).
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

userSchema.plugin(toJSONPlugin);

export const User = model<IUser>('User', userSchema);

/** The public, safe view of a user (never includes the hash). */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: (user._id as Types.ObjectId).toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}
