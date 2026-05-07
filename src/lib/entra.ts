/**
 * Entra External ID – Native Authentication helpers
 *
 * All calls are made server-side. The native auth API does not support CORS,
 * so the browser must never call these endpoints directly.
 *
 * Docs: https://learn.microsoft.com/en-us/entra/identity-platform/reference-native-authentication-api
 */

const TENANT = process.env.ENTRA_TENANT_SUBDOMAIN;
const CLIENT_ID = process.env.ENTRA_CLIENT_ID;

function baseUrl() {
  if (!TENANT || !CLIENT_ID) {
    throw new Error(
      "ENTRA_TENANT_SUBDOMAIN and ENTRA_CLIENT_ID must be set in .env.local"
    );
  }
  return `https://${TENANT}.ciamlogin.com/${TENANT}.onmicrosoft.com`;
}

async function post(path: string, params: Record<string, string>) {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  // Native auth always returns JSON (even for errors).
  return res.json() as Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Sign-up endpoints
// ---------------------------------------------------------------------------

/**
 * Start the sign-up flow, submitting username and password in one call.
 * Returns a continuation_token on success.
 */
export function signupStart(username: string, password: string) {
  return post("/signup/v1.0/start", {
    client_id: CLIENT_ID!,
    username,
    password,
    challenge_type: "oob password redirect",
  });
}

/**
 * Ask Entra to send a one-time passcode (OTP) email to the user.
 * Returns a new continuation_token plus OTP metadata.
 */
export function signupChallenge(continuation_token: string) {
  return post("/signup/v1.0/challenge", {
    client_id: CLIENT_ID!,
    challenge_type: "oob password redirect",
    continuation_token,
  });
}

/**
 * Submit the OTP the user typed. Returns a continuation_token ready
 * to exchange for security tokens.
 */
export function signupContinueOtp(continuation_token: string, oob: string) {
  return post("/signup/v1.0/continue", {
    client_id: CLIENT_ID!,
    continuation_token,
    grant_type: "oob",
    oob,
  });
}

// ---------------------------------------------------------------------------
// Sign-in endpoints
// ---------------------------------------------------------------------------

/** Initiate a sign-in flow for the given username. */
export function signinInitiate(username: string) {
  return post("/oauth2/v2.0/initiate", {
    client_id: CLIENT_ID!,
    username,
    challenge_type: "password redirect",
  });
}

/** Select the password challenge type. */
export function signinChallenge(continuation_token: string) {
  return post("/oauth2/v2.0/challenge", {
    client_id: CLIENT_ID!,
    challenge_type: "password redirect",
    continuation_token,
  });
}

/** Exchange the continuation token + password for security tokens. */
export function signinToken(continuation_token: string, password: string) {
  return post("/oauth2/v2.0/token", {
    client_id: CLIENT_ID!,
    continuation_token,
    grant_type: "password",
    password,
    scope: "openid offline_access profile",
  });
}

// ---------------------------------------------------------------------------
// Token endpoint (used after sign-up OTP verification)
// ---------------------------------------------------------------------------

/**
 * Exchange a post-signup continuation_token for security tokens.
 * grant_type must be "continuation_token" for this use-case.
 */
export function getTokenAfterSignup(continuation_token: string) {
  return post("/oauth2/v2.0/token", {
    client_id: CLIENT_ID!,
    continuation_token,
    grant_type: "continuation_token",
    scope: "openid offline_access profile",
  });
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/** Decode the payload of a JWT without verifying the signature (POC only). */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Invalid JWT: missing payload segment");
  const json = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(json) as Record<string, unknown>;
}
