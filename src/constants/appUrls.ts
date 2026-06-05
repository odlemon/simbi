// @ts-nocheck

/** Canonical public app URL (no trailing slash). */
export const APP_BASE_URL = (
  process.env.FRONTEND_URL ||
  process.env.APP_URL ||
  process.env.ADMIN_PORTAL_URL ||
  "https://www.simbimarket.com"
).replace(/\/$/, "");

/** Unified login page path used in emails and deep links. */
export const APP_LOGIN_PATH = "/auth/login";

export function appUrl(path = ""): string {
  if (!path) return APP_BASE_URL;
  return `${APP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function loginUrl(): string {
  return appUrl(APP_LOGIN_PATH);
}
