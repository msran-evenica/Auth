export const SESSION_COOKIE_NAME = "auth_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name?: string;
  exp: number;
  id_token: string;
  refresh_token: string;
  decoded_id_token: Record<string, unknown>;
};

export function createSessionCookieValue(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function readSessionCookieValue(value: string | undefined): SessionPayload | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as SessionPayload;

    if (!parsed.sub || !parsed.email || !parsed.exp || !parsed.refresh_token || !parsed.id_token) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isExpired(epochSeconds: number): boolean {
  return epochSeconds * 1000 <= Date.now();
}
