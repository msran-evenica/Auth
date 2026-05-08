import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { SESSION_TTL_SECONDS, SESSION_UPDATE_AGE_SECONDS } from "@/lib/auth-constants";
import { authDb } from "@/lib/auth-db";

export const auth = betterAuth({
  appName: "Auth POC",
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.APP_SESSION_SECRET,
  database: authDb,
  session: {
    expiresIn: SESSION_TTL_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
    additionalFields: {
      decodedIdToken: {
        type: "json",
        required: false,
      },
      entraExternalIdToken: {
        type: "string",
        required: false,
        returned: false,
      },
      entraExternalRefreshToken: {
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
