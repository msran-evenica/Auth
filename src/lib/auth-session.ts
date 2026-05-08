import { makeSignature } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from "@/lib/auth-constants";
import { decodeJwtPayload, refreshTokens } from "@/lib/entra";

export type SessionPayload = {
  sub: string;
  email: string;
  name?: string;
  exp: number;
  refresh_token?: string;
  decoded_id_token: Record<string, unknown>;
  idToken?: string;
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

  await internalAdapter.deleteSessions(user.id);

  const session = await internalAdapter.createSession(
    user.id,
    false,
    {
      expiresAt: new Date(payload.exp * 1000),
      decodedIdToken: payload.decoded_id_token,
      entraExternalIdToken: payload.idToken,
      entraExternalRefreshToken: payload.refresh_token,
    },
    true,
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

async function readPrivateSessionTokenFields(sessionToken: string) {
  const { adapter } = await auth.$context;
  return adapter.findOne<{
    entraExternalIdToken?: string | null;
    entraExternalRefreshToken?: string | null;
  }>({
    model: "session",
    where: [
      {
        field: "token",
        value: sessionToken,
      },
    ],
  });
}

async function refreshSessionIfNeeded(
  session: Awaited<ReturnType<typeof auth.api.getSession>>,
  forceRefresh = false,
) {
  if (!session) return null;

  const refreshAt =
    session.session.expiresAt.getTime() -
    SESSION_TTL_SECONDS * 1000 +
    SESSION_UPDATE_AGE_SECONDS * 1000;

  if (!forceRefresh && refreshAt > Date.now()) {
    return session;
  }

  const { internalAdapter } = await auth.$context;
  const stored = await readPrivateSessionTokenFields(session.session.token);
  const refreshToken =
    stored?.entraExternalRefreshToken && typeof stored.entraExternalRefreshToken === "string"
      ? stored.entraExternalRefreshToken
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
    updatedAt: new Date(),
    decodedIdToken: decoded,
    entraExternalIdToken: tokenData.id_token,
    entraExternalRefreshToken:
      typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : refreshToken,
  });

  return auth.api.getSession({
    headers: new Headers({
      cookie: `${SESSION_COOKIE_NAME}=${session.session.token}.${await makeSignature(
        session.session.token,
        getSessionSecret(),
      )}`,
    }),
    query: { disableCookieCache: true, disableRefresh: true },
  });
}

export async function readSessionCookieValueFromHeaders(
  headers: Headers,
  options?: { forceRefresh?: boolean },
): Promise<SessionPayload | null> {
  const currentSession = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });
  const session = await refreshSessionIfNeeded(currentSession, options?.forceRefresh);

  if (!session) return null;
  const storedSession = await readPrivateSessionTokenFields(session.session.token);

  const decodedIdToken =
    session.session.decodedIdToken && typeof session.session.decodedIdToken === "object"
      ? (session.session.decodedIdToken as Record<string, unknown>)
      : {};
  const idToken =
    storedSession?.entraExternalIdToken && typeof storedSession.entraExternalIdToken === "string"
      ? storedSession.entraExternalIdToken
      : undefined;
  const refreshToken =
    storedSession?.entraExternalRefreshToken && typeof storedSession.entraExternalRefreshToken === "string"
      ? storedSession.entraExternalRefreshToken
      : undefined;

  return {
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name,
    exp: Math.floor(session.session.expiresAt.getTime() / 1000),
    decoded_id_token: decodedIdToken,
    idToken,
    refresh_token: refreshToken,
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
  SESSION_UPDATE_AGE_SECONDS,
};
