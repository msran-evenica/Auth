import { NextRequest, NextResponse } from "next/server";
import { readSessionCookieValueFromHeaders } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  const session = await readSessionCookieValueFromHeaders(request.headers, {
    forceRefresh: request.nextUrl.searchParams.get("refresh") === "true",
  });

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
    entra_external_id_token: session.idToken ?? null,
    entra_external_refresh_token: session.refresh_token ?? null,
  });
}
