import { makeSignature } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { decodeJwtPayload, refreshTokens } from "@/lib/entra";

const SESSION_TTL_SECONDS = 60 * 60; // 1 hour
const SESSION_COOKIE_NAME = "better-auth.session_token";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const TOKEN_REFRESH_THRESHOLD_SECONDS = 5 * 60;

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
  const { internalAdapter, authCookies } = await auth.$context;
  const existing = await internalAdapter.findUserByEmail(payload.email, { includeAccounts: false });
  const user =
    existing?.user ??
    (await internalAdapter.createUser({
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      emailVerified: true,
    }));

  const session = await internalAdapter.createSession(
    user.id,
    false,
    {
      expiresAt: new Date(payload.exp * 1000),
      decodedIdToken: payload.decoded_id_token,
      entraRefreshToken: payload.refresh_token,
    },
  );

  const signedToken = `${session.token}.${await makeSignature(session.token, getSessionSecret())}`;

  return JSON.stringify({
    name: authCookies.sessionToken.name,
    value: signedToken,
    attributes: {
      ...authCookies.sessionToken.attributes,
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    },
  });
}

async function refreshSessionIfNeeded(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  if (!session) return null;

  const remainingSeconds = Math.floor((session.session.expiresAt.getTime() - Date.now()) / 1000);
  if (remainingSeconds > TOKEN_REFRESH_THRESHOLD_SECONDS) {
    return session;
  }

  const { internalAdapter } = await auth.$context;
  const stored = await internalAdapter.findSession(session.session.token);
  const refreshToken =
    stored?.session.entraRefreshToken && typeof stored.session.entraRefreshToken === "string"
      ? stored.session.entraRefreshToken
      : null;

  if (!refreshToken) return session;

  const tokenData = await refreshTokens(refreshToken);
  if (tokenData.error || typeof tokenData.id_token !== "string") {
    return session;
  }

  const decoded = decodeJwtPayload(tokenData.id_token);
  const exp =
    typeof decoded.exp === "number"
      ? decoded.exp
      : Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  await internalAdapter.updateSession(session.session.token, {
    expiresAt: new Date(exp * 1000),
    decodedIdToken: decoded,
    entraRefreshToken:
      typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : refreshToken,
  });

  return auth.api.getSession({
    headers: new Headers({
      cookie: `${SESSION_COOKIE_NAME}=${session.session.token}.${await makeSignature(
        session.session.token,
        getSessionSecret(),
      )}`,
    }),
    query: { disableCookieCache: true },
  });
}

export async function readSessionCookieValueFromHeaders(headers: Headers): Promise<SessionPayload | null> {
  const currentSession = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  const session = await refreshSessionIfNeeded(currentSession);

  if (!session) return null;

  const decodedIdToken =
    session.session.decodedIdToken && typeof session.session.decodedIdToken === "object"
      ? (session.session.decodedIdToken as Record<string, unknown>)
      : {};

  return {
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name,
    exp: Math.floor(session.session.expiresAt.getTime() / 1000),
    decoded_id_token: decodedIdToken,
  };
}

export async function readSessionCookieValue(value: string | undefined): Promise<SessionPayload | null> {
  if (!value) return null;

  const headers = new Headers({
    cookie: `${SESSION_COOKIE_NAME}=${value}`,
  });

  return readSessionCookieValueFromHeaders(headers);
}

export function getBetterAuthCookieFromSerializedSession(serializedSession: string) {
  const cookie = JSON.parse(serializedSession) as {
    name: string;
    value: string;
    attributes: {
      domain?: string;
      expires?: Date;
      httpOnly: boolean;
      maxAge?: number;
      path: string;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
    };
  };

  return {
    ...cookie,
    attributes: {
      ...cookie.attributes,
      sameSite: cookie.attributes.sameSite.toLowerCase() as "strict" | "lax" | "none",
    },
  };
}

export {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  TOKEN_REFRESH_THRESHOLD_SECONDS,
};
