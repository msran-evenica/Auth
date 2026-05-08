import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";

const globalForAuth = globalThis as typeof globalThis & {
  betterAuthMemoryDb?: MemoryDB;
};

const memoryDb =
  globalForAuth.betterAuthMemoryDb ??
  (globalForAuth.betterAuthMemoryDb = {
    user: [],
    session: [],
    account: [],
    verification: [],
  });

export const auth = betterAuth({
  appName: "Auth POC",
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.APP_SESSION_SECRET,
  database: memoryAdapter(memoryDb),
  session: {
    expiresIn: 60 * 60,
    updateAge: 15 * 60,
    additionalFields: {
      decodedIdToken: {
        type: "json",
        required: false,
      },
      entraRefreshToken: {
        type: "string",
        required: false,
        returned: false,
      },
    },
  },
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          sameSite: "strict",
        },
      },
    },
  },
  plugins: [nextCookies()],
});
