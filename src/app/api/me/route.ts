import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, createSessionCookieValue, isExpired, readSessionCookieValue } from "@/lib/auth-session";
import { decodeJwtPayload, refreshWithToken } from "@/lib/entra";

export async function GET(request: NextRequest) {
  const session = readSessionCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let current = session;

  if (isExpired(session.exp)) {
    const refreshData = await refreshWithToken(session.refresh_token);
    if (refreshData.error || !refreshData.id_token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const decoded = decodeJwtPayload(String(refreshData.id_token));
    current = {
      ...session,
      id_token: String(refreshData.id_token),
      refresh_token: String(refreshData.refresh_token ?? session.refresh_token),
      decoded_id_token: decoded,
      exp: typeof decoded.exp === "number" ? decoded.exp : session.exp,
      email: String(decoded.email ?? session.email),
      name: typeof decoded.name === "string" ? decoded.name : session.name,
      sub: String(decoded.sub ?? session.sub),
    };
  }

  const response = NextResponse.json({
    user: { sub: current.sub, email: current.email, name: current.name ?? null, expires_at: current.exp },
    decoded_id_token: current.decoded_id_token,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionCookieValue(current),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
