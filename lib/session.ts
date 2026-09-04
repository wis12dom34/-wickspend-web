export const SESSION_TOKEN_KEY = "wickspend_session_token";
export const LEGACY_SESSION_TOKEN_KEY = "wickspend_token";

export function getSessionToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(LEGACY_SESSION_TOKEN_KEY) || "";
}

export function saveSessionToken(token: string) {
  if (typeof window === "undefined" || !token) return;
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
}
