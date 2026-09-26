import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const DEFAULT_RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'root',
  'api',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'profile',
  'profiles',
  'user',
  'users',
  'onewinq',
  'support',
  'help',
  'terms',
  'privacy',
  'billing',
  'payment',
  'dashboard',
  'settings',
  'health',
  'status',
  'developer',
  'dev',
  'docs',
  'card',
  'cards',
  'connect',
  'connections',
  'messages',
  'notifications',
  'orders',
  'subscriptions',
  'analytics',
  'discovery',
  'explore',
  'search',
  'public',
];

const reservedUsernameSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      default: 'System reserved',
    },
    isSystemReserved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ReservedUsername =
  mongoose.models.ReservedUsername || model('ReservedUsername', reservedUsernameSchema);

/**
 * Check if a username is in the reserved list (static built-in + database).
 */
export async function isUsernameReserved(username) {
  if (!username) {return true;}
  const normalized = username.trim().toLowerCase();

  // Fast check built-in list
  if (DEFAULT_RESERVED_USERNAMES.includes(normalized)) {
    return true;
  }

  // Database check for custom admin reservations
  const found = await ReservedUsername.findOne({ username: normalized }).lean();
  return Boolean(found);
}
