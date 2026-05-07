import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, readSessionCookieValue } from "@/lib/auth-session";

export async function middleware(request: NextRequest) {
  const session = await readSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/activate") && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/activate"],
};
