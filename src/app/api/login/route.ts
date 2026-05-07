import { NextRequest, NextResponse } from "next/server";
import { signinInitiate, signinChallenge, signinToken, decodeJwtPayload } from "@/lib/entra";
import { SESSION_COOKIE_NAME, createSessionCookieValue } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const initiateData = await signinInitiate(email);
  if (initiateData.error) return NextResponse.json(initiateData, { status: 400 });

  const challengeData = await signinChallenge(initiateData.continuation_token as string);
  if (challengeData.error) return NextResponse.json(challengeData, { status: 400 });

  const tokenData = await signinToken(challengeData.continuation_token as string, password);
  if (tokenData.error) return NextResponse.json(tokenData, { status: 401 });

  const idToken = String(tokenData.id_token);
  const refreshToken = String(tokenData.refresh_token ?? "");
  const decoded = decodeJwtPayload(idToken);
  const exp = typeof decoded.exp === "number" ? decoded.exp : Math.floor(Date.now() / 1000) + 3600;

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionCookieValue({
      sub: String(decoded.sub ?? ""),
      email: String(decoded.email ?? email),
      name: typeof decoded.name === "string" ? decoded.name : undefined,
      exp,
      id_token: idToken,
      refresh_token: refreshToken,
      decoded_id_token: decoded,
    }),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
