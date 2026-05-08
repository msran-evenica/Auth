function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export const SESSION_TTL_SECONDS = readPositiveIntegerEnv("AUTH_SESSION_TTL_SECONDS", 60 * 60);
export const SESSION_UPDATE_AGE_SECONDS = readPositiveIntegerEnv("AUTH_SESSION_UPDATE_AGE_SECONDS", 15 * 60);
export const SESSION_COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME ?? "better-auth.session_token";
export const SESSION_COOKIE_MAX_AGE_SECONDS = readPositiveIntegerEnv(
  "AUTH_SESSION_COOKIE_MAX_AGE_SECONDS",
  60 * 60 * 24 * 7,
);
