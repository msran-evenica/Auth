import { headers } from "next/headers";
import { readSessionCookieValueFromHeaders } from "@/lib/auth-session";

export async function getCurrentSession() {
  const headerStore = await headers();
  return readSessionCookieValueFromHeaders(new Headers(headerStore));
}
