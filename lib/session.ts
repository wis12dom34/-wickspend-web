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

export function sessionTokenFromResponse(response: any) {
  return response?.session_token || response?.token || response?.access_token || response?.accessToken ||
    response?.data?.session_token || response?.data?.token || response?.session?.session_token ||
    response?.session?.token || response?.data?.session?.session_token || response?.data?.session?.token || "";
}

export function saveSessionResponse(response: any) {
  const token = sessionTokenFromResponse(response);
  if (!token) return "";
  const value = String(token);
  saveSessionToken(value);
  return value;
}

export function clearSessionTokenIfMatches(token: string) {
  if (typeof window === "undefined" || !token) return;
  if (getSessionToken() === token) clearSessionToken();
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
}
