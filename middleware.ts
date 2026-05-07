import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, readSessionCookieValue } from "@/lib/auth-session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = readSessionCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/" && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
