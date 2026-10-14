import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
export const CALENDAR_SUMMARY = "Zsidó közösségi naptár";

export class GoogleAuthError extends Error {}

export function redirectUri(): string {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/google/callback`;
}

function clientCredentials() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Google OAuth client is not configured");
  return { id, secret };
}

export function buildAuthUrl(state: string): string {
  const { id } = clientCredentials();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar openid email",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { id, secret } = clientCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...body }),
  });
  const text = await res.text();
  if (!res.ok) {
    if (text.includes("invalid_grant")) throw new GoogleAuthError("Google access was revoked");
    throw new Error(`Google token request failed (${res.status})`);
  }
  return JSON.parse(text) as TokenResponse;
}

export async function exchangeCode(code: string) {
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
  let email: string | null = null;
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
      email = typeof payload.email === "string" ? payload.email : null;
    } catch {
      email = null;
    }
  }
  return { ...tokens, email };
}

export async function getAccessToken(accountId: number): Promise<string> {
  const account = await prisma.googleAccount.findUniqueOrThrow({ where: { id: accountId } });
  if (
    account.encryptedAccessToken &&
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt.getTime() - Date.now() > 60_000
  ) {
    return decrypt(account.encryptedAccessToken);
  }
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: decrypt(account.encryptedRefreshToken),
  });
  await prisma.googleAccount.update({
    where: { id: accountId },
    data: {
      encryptedAccessToken: encrypt(tokens.access_token),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}

export async function calendarFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const maxAttempts = 7;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${CALENDAR_API}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (res.status === 401) throw new GoogleAuthError("Google access token rejected");
    const retryable =
      res.status === 429 || res.status >= 500 || (res.status === 403 && (await isRateLimit(res)));
    if (!retryable || attempt >= maxAttempts - 1) return res;
    await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 30_000) + Math.random() * 500));
  }
}

async function isRateLimit(res: Response): Promise<boolean> {
  const text = await res.clone().text();
  return /rateLimitExceeded|userRateLimitExceeded|quotaExceeded|usage limits exceeded/i.test(text);
}

export async function createCalendar(accessToken: string): Promise<string> {
  const res = await calendarFetch(accessToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({
      summary: CALENDAR_SUMMARY,
      description: "Automatikusan szinkronizált; a kézi módosításokat a következő szinkron felülírja.",
    }),
  });
  if (!res.ok) throw new Error(`Calendar creation failed (${res.status})`);
  return ((await res.json()) as { id: string }).id;
}

export async function calendarExists(accessToken: string, calendarId: string): Promise<boolean> {
  const res = await calendarFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}`);
  return res.ok;
}
