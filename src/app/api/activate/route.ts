import { NextRequest, NextResponse } from "next/server";
import { signupStart, signupChallenge } from "@/lib/entra";

/**
 * POST /api/activate
 *
 * Step 1 of the sign-up flow:
 *   1. Call /signup/v1.0/start  (registers username + password with Entra)
 *   2. Call /signup/v1.0/challenge (Entra sends OTP email)
 *
 * Returns:
 *   { step: "otp_required", continuation_token, challenge_target_label, code_length }
 *
 * The client should then collect the OTP and POST it to /api/activate/verify.
 */
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

  // Step 1 – start sign-up (submit username + password together)
  const startData = await signupStart(email, password);

  if (startData.error) {
    const status = startData.error === "user_already_exists" ? 409 : 400;
    return NextResponse.json(
      {
        error: startData.error,
        error_description: startData.error_description,
        suberror: startData.suberror,
      },
      { status }
    );
  }

  const startToken = startData.continuation_token as string;

  // Step 2 – trigger OTP email challenge
  const challengeData = await signupChallenge(startToken);

  if (challengeData.error) {
    return NextResponse.json(
      {
        error: challengeData.error,
        error_description: challengeData.error_description,
      },
      { status: 400 }
    );
  }

  if (challengeData.challenge_type === "redirect") {
    return NextResponse.json(
      { error: "redirect_required", error_description: "This tenant requires browser-based authentication." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    step: "otp_required",
    continuation_token: challengeData.continuation_token,
    challenge_target_label: challengeData.challenge_target_label,
    code_length: challengeData.code_length ?? 8,
  });
}
