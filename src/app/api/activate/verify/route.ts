import { NextRequest, NextResponse } from "next/server";
import { signupContinueOtp, getTokenAfterSignup, decodeJwtPayload } from "@/lib/entra";

/**
 * POST /api/activate/verify
 *
 * Step 2 of the sign-up flow:
 *   1. Submit the OTP the user typed  (/signup/v1.0/continue, grant_type=oob)
 *   2. Exchange the resulting continuation token for security tokens
 *
 * Body: { otp: string; continuation_token: string }
 *
 * Returns:
 *   { tokens: { id_token, access_token, expires_in }, decoded_id_token: { ... } }
 */
export async function POST(request: NextRequest) {
  let otp: string | undefined;
  let continuation_token: string | undefined;

  try {
    const body = await request.json();
    otp = body.otp;
    continuation_token = body.continuation_token;
  } catch {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!otp || !continuation_token) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "otp and continuation_token are required" },
      { status: 400 }
    );
  }

  // Step 1 – verify OTP
  const continueData = await signupContinueOtp(continuation_token, otp);

  if (continueData.error) {
    return NextResponse.json(
      {
        error: continueData.error,
        error_description: continueData.error_description,
        suberror: continueData.suberror,
      },
      { status: 400 }
    );
  }

  // Step 2 – exchange continuation token for security tokens (seamless sign-in after sign-up)
  const tokenData = await getTokenAfterSignup(continueData.continuation_token as string);

  if (tokenData.error) {
    return NextResponse.json(
      { error: tokenData.error, error_description: tokenData.error_description },
      { status: 400 }
    );
  }

  const idToken = tokenData.id_token as string;
  const decoded = decodeJwtPayload(idToken);

  return NextResponse.json({
    tokens: {
      id_token: tokenData.id_token,
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    },
    decoded_id_token: decoded,
  });
}
