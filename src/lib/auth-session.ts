const SESSION_COOKIE_NAME = "auth_session";
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour

export type SessionPayload = {
  sub: string;
  email: string;
  name?: string;
  exp: number;
};

export function createSessionCookieValue(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function readSessionCookieValue(value: string | undefined): SessionPayload | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as SessionPayload;

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
