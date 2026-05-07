import { NextRequest, NextResponse } from "next/server";
import { verifySignUpOtpWithEntra } from "@/lib/better-auth-entra";

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

  const verifyResult = await verifySignUpOtpWithEntra(continuation_token, otp);

  if (verifyResult.error) {
    return NextResponse.json(verifyResult, { status: 400 });
  }

  return NextResponse.json(verifyResult);
}
