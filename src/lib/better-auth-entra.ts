import { decodeJwtPayload, getTokenAfterSignup, signinChallenge, signinInitiate, signinToken, signupChallenge, signupContinueOtp, signupStart } from "@/lib/entra";

export interface AuthTokens {
  id_token: string;
  access_token: string;
  expires_in: number;
}

export async function signInWithEntra(email: string, password: string) {
  const initiateData = await signinInitiate(email);
  if (initiateData.error) return { error: initiateData.error, error_description: initiateData.error_description };
  if (initiateData.challenge_type === "redirect") return { error: "redirect_required", error_description: "This tenant requires browser-based authentication." };

  const challengeData = await signinChallenge(initiateData.continuation_token as string);
  if (challengeData.error) return { error: challengeData.error, error_description: challengeData.error_description };
  if (challengeData.challenge_type === "redirect") return { error: "redirect_required", error_description: "This tenant requires browser-based authentication." };

  const tokenData = await signinToken(challengeData.continuation_token as string, password);
  if (tokenData.error) return { error: tokenData.error, error_description: tokenData.error_description };

  const tokens: AuthTokens = {
    id_token: tokenData.id_token as string,
    access_token: tokenData.access_token as string,
    expires_in: tokenData.expires_in as number,
  };

  return { tokens, decoded_id_token: decodeJwtPayload(tokens.id_token) };
}

export async function startSignUpWithEntra(email: string, password: string) {
  const startData = await signupStart(email, password);
  if (startData.error) return { error: startData.error, error_description: startData.error_description, suberror: startData.suberror };

  const challengeData = await signupChallenge(startData.continuation_token as string);
  if (challengeData.error) return { error: challengeData.error, error_description: challengeData.error_description };
  if (challengeData.challenge_type === "redirect") return { error: "redirect_required", error_description: "This tenant requires browser-based authentication." };

  return {
    step: "otp_required",
    continuation_token: challengeData.continuation_token,
    challenge_target_label: challengeData.challenge_target_label,
    code_length: challengeData.code_length ?? 8,
  };
}

export async function verifySignUpOtpWithEntra(continuation_token: string, otp: string) {
  const continueData = await signupContinueOtp(continuation_token, otp);
  if (continueData.error) return { error: continueData.error, error_description: continueData.error_description, suberror: continueData.suberror };

  const tokenData = await getTokenAfterSignup(continueData.continuation_token as string);
  if (tokenData.error) return { error: tokenData.error, error_description: tokenData.error_description };

  const tokens: AuthTokens = {
    id_token: tokenData.id_token as string,
    access_token: tokenData.access_token as string,
    expires_in: tokenData.expires_in as number,
  };

  return { tokens, decoded_id_token: decodeJwtPayload(tokens.id_token) };
}
