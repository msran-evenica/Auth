import { NextRequest, NextResponse } from "next/server";
import { signinInitiate, signinChallenge, signinToken, decodeJwtPayload } from "@/lib/entra";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, createSessionCookieValue } from "@/lib/auth-session";

/**
 * POST /api/login
 *  
 * Full sign-in flow (email + password):
 *   1. /oauth2/v2.0/initiate
 *   2. /oauth2/v2.0/challenge
 *   3. /oauth2/v2.0/token  (grant_type=password)
 *
 * Returns:
 *   { tokens: { id_token, access_token, expires_in }, decoded_id_token: { ... } }
 *
 * The decoded_id_token is printed on the page for POC purposes.
 */
export async function POST(request: NextRequest) {
  let email: string | undefined;
  let password: string | undefined;

  try {
    const body = await request.json();
    email = body.email;
    password = body.password;
  } catch {
    return NextResponse.json({ error: "invalid_request", error_description: "Invalid JSON body" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "email and password are required" },
      { status: 400 }
    );
  }

  // Step 1 – initiate
  const initiateData = await signinInitiate(email);
  if (initiateData.error) {
    const status = initiateData.error === "user_not_found" ? 404 : 400;
    return NextResponse.json(
      { error: initiateData.error, error_description: initiateData.error_description },
      { status }
    );
  }
  if (initiateData.challenge_type === "redirect") {
    return NextResponse.json(
      { error: "redirect_required", error_description: "This tenant requires browser-based authentication." },
      { status: 400 }
    );
  }

  // Step 2 – select password challenge
  const challengeData = await signinChallenge(initiateData.continuation_token as string);
  if (challengeData.error) {
    return NextResponse.json(
      { error: challengeData.error, error_description: challengeData.error_description },
      { status: 400 }
    );
  }
  if (challengeData.challenge_type === "redirect") {
    return NextResponse.json(
      { error: "redirect_required", error_description: "This tenant requires browser-based authentication." },
      { status: 400 }
    );
  }

  // Step 3 – exchange for tokens
  const tokenData = await signinToken(challengeData.continuation_token as string, password);
  if (tokenData.error) {
    const status = tokenData.error === "invalid_grant" ? 401 : 400;
    return NextResponse.json(
      { error: tokenData.error, error_description: tokenData.error_description },
      { status }
    );
  }

  const idToken = tokenData.id_token as string;
  const decoded = decodeJwtPayload(idToken);
  const exp = typeof decoded.exp === "number" ? decoded.exp : Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const session = await createSessionCookieValue({
    sub: String(decoded.sub ?? ""),
    email: String(decoded.email ?? email),
    name: typeof decoded.name === "string" ? decoded.name : undefined,
    exp,
    tokens: {
      id_token: tokenData.id_token as string,
      access_token: tokenData.access_token as string,
      expires_in: tokenData.expires_in as number,
    },
    decoded_id_token: decoded,
  });

  const response = NextResponse.json({
    tokens: {
      id_token: tokenData.id_token as string,
      access_token: tokenData.access_token as string,
      expires_in: tokenData.expires_in as number,
    },
    decoded_id_token: decoded,
    session: {
      email: String(decoded.email ?? email),
      name: typeof decoded.name === "string" ? decoded.name : null,
      expires_at: exp,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
