import { symmetricDecodeJWT, symmetricEncodeJWT } from "better-auth/crypto";

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour
const SESSION_TOKEN_SALT = "entra-session";

export type SessionPayload = {
  sub: string;
  email: string;
  name?: string;
  exp: number;
  refresh_token?: string;
  decoded_id_token: Record<string, unknown>;
};

function getSessionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET (or APP_SESSION_SECRET) must be set for session handling");
  }
  return secret;
}

export async function createSessionCookieValue(payload: SessionPayload): Promise<string> {
  return symmetricEncodeJWT(payload, getSessionSecret(), SESSION_TOKEN_SALT, SESSION_TTL_SECONDS);
}

export async function readSessionCookieValue(value: string | undefined): Promise<SessionPayload | null> {
  if (!value) return null;

  try {
    const decoded = await symmetricDecodeJWT(value, getSessionSecret(), SESSION_TOKEN_SALT);
    const parsed = decoded as SessionPayload;

    if (!parsed.sub || !parsed.email || !parsed.exp) {
      return null;
    }

    if (parsed.exp * 1000 < Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS };
