import { NextRequest, NextResponse } from "next/server";
import { readSessionCookieValueFromHeaders } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  const session = await readSessionCookieValueFromHeaders(request.headers);

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
    decoded_id_token: session.decoded_id_token,
  });
}
