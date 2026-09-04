const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");

export type ApiOptions = RequestInit & { token?: string | null };

export async function wickspendApi<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;
  const response = await fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload && typeof payload === "object" && "ok" in payload && payload.ok === false)) {
    const message = payload && typeof payload === "object" && "code" in payload
      ? String(payload.code)
      : payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `WickSpend request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export const newRequestKey = (prefix = "web") =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export const api = {
  auth: {
    telegramStart: (body: unknown) => wickspendApi("wickspend/backend/auth/telegram/request", { method: "POST", body: JSON.stringify(body) }),
    telegramVerify: (body: unknown) => wickspendApi("wickspend/backend/auth/telegram/verify", { method: "POST", body: JSON.stringify(body) }),
    session: (token: string) => wickspendApi("wickspend/backend/auth/session", { token }),
    logout: (token: string) => wickspendApi("wickspend/backend/auth/logout", { method: "POST", token, body: "{}" }),
  },
  wallet: {
    get: (token: string) => wickspendApi("wickspend/backend/wallet", { token }),
    transactions: (token: string) => wickspendApi("wickspend/backend/transactions", { token }),
    initializeFunding: (token: string, amount_ngn: number) => wickspendApi("wickspend/backend/funding/initialize", { method: "POST", token, body: JSON.stringify({ amount_ngn }) }),
  },
  numbers: {
    catalog: (params: Record<string, string | number | undefined> = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") search.set(key, String(value));
      });
      return wickspendApi(`wickspend/backend/numbers/catalog${search.toString() ? `?${search}` : ""}`);
    },
    countries: (_token?: string) => wickspendApi("wickspend/backend/numbers/catalog"),
    services: (_token: string, country_code: string) => wickspendApi(`wickspend/backend/numbers/catalog?country_code=${encodeURIComponent(country_code)}`),
    prices: (_token: string, country_code: string, service_code: string) => wickspendApi(`wickspend/backend/numbers/catalog?country_code=${encodeURIComponent(country_code)}&service_code=${encodeURIComponent(service_code)}`),
    buy: (token: string, body: { country_code: string; service_code: string; request_key?: string }) => wickspendApi("wickspend/backend/numbers/buy", { method: "POST", token, body: JSON.stringify({ ...body, request_key: body.request_key || newRequestKey("number") }) }),
    active: (token: string) => wickspendApi("wickspend/backend/numbers/active", { token }),
    status: (token: string, reference: string) => wickspendApi(`wickspend/backend/numbers/status?reference=${encodeURIComponent(reference)}`, { token }),
    cancel: (token: string, reference: string) => wickspendApi("wickspend/backend/numbers/cancel", { method: "POST", token, body: JSON.stringify({ reference }) }),
  },
  rentals: {
    catalog: () => wickspendApi("wickspend/backend/rentals/catalog"),
    create: (token: string, input: { service_code: string; duration_minutes: 1440 | 4320 | 10080 | 20160 | 43200; country_code?: "US" | "USA"; auto_renew?: boolean; request_key?: string }) =>
      wickspendApi("wickspend/backend/rentals/create", {
        method: "POST",
        token,
        body: JSON.stringify({
          country_code: input.country_code ?? "US",
          service_code: input.service_code,
          duration_minutes: input.duration_minutes,
          auto_renew: input.auto_renew === true,
          request_key: input.request_key ?? newRequestKey("rent"),
        }),
      }),
    status: (token: string, reference: string) => wickspendApi(`wickspend/backend/rentals/status?reference=${encodeURIComponent(reference)}`, { token }),
    cancel: (token: string, reference: string) => wickspendApi("wickspend/backend/rentals/cancel", { method: "POST", token, body: JSON.stringify({ reference }) }),
    extend: (token: string, reference: string, request_key = newRequestKey("rent-ext")) => wickspendApi("wickspend/backend/rentals/extend", { method: "POST", token, body: JSON.stringify({ reference, request_key }) }),
  },
  orders: (token: string) => wickspendApi("wickspend/backend/orders", { token }),
  notifications: (token: string) => wickspendApi("wickspend/backend/notifications", { token }),
};
