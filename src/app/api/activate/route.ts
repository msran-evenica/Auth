import { NextRequest, NextResponse } from "next/server";
import { startSignUpWithEntra } from "@/lib/better-auth-entra";

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

  const signUpResult = await startSignUpWithEntra(email, password);

  if (signUpResult.error) {
    const status = signUpResult.error === "user_already_exists" ? 409 : 400;
    return NextResponse.json(signUpResult, { status });
  }

  return NextResponse.json(signUpResult);
}
