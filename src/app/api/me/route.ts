import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, readSessionCookieValue } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = readSessionCookieValue(cookie);

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      sub: session.sub,
      email: session.email,
      name: session.name ?? null,
      expires_at: session.exp,
    },
  });
}
