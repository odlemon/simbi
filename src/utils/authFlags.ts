/**
 * Email verification on login is optional until you set REQUIRE_EMAIL_VERIFICATION=true in .env.
 * Default: off (allows admin/seller/buyer login without verify-email step).
 */
export function isEmailVerificationRequiredForLogin(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === "true";
}
