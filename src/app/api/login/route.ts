import { NextRequest, NextResponse } from "next/server";
import { signInWithEntra } from "@/lib/better-auth-entra";

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

  const signInResult = await signInWithEntra(email, password);

  if (signInResult.error) {
    const status = signInResult.error === "user_not_found" ? 404 : signInResult.error === "invalid_grant" ? 401 : 400;
    return NextResponse.json(
      { error: signInResult.error, error_description: signInResult.error_description },
      { status }
    );
  }

  return NextResponse.json(signInResult);
}
