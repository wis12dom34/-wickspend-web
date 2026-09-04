const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");

export type ApiOptions = RequestInit & { token?: string | null };

export async function wickspendApi<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;
  const response = await fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload
      ? String(payload.message)
      : `WickSpend request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export const api = {
  auth: {
    telegramStart: (body: unknown) => wickspendApi("wickspend-auth-telegram-start", { method: "POST", body: JSON.stringify(body) }),
    telegramVerify: (body: unknown) => wickspendApi("wickspend-auth-telegram-verify", { method: "POST", body: JSON.stringify(body) }),
  },
  wallet: {
    get: (token: string) => wickspendApi("wickspend-wallet", { token }),
  },
  numbers: {
    countries: (token: string) => wickspendApi("wickspend-sms-countries", { token }),
    services: (token: string, country: string) => wickspendApi(`wickspend-sms-services?country=${encodeURIComponent(country)}`, { token }),
    prices: (token: string, country: string, service: string) => wickspendApi(`wickspend-sms-prices?country=${encodeURIComponent(country)}&service=${encodeURIComponent(service)}`, { token }),
    buy: (token: string, body: unknown) => wickspendApi("wickspend-sms-buy", { method: "POST", token, body: JSON.stringify(body) }),
    status: (token: string, orderId: string) => wickspendApi(`wickspend-sms-status?order_id=${encodeURIComponent(orderId)}`, { token }),
    cancel: (token: string, body: unknown) => wickspendApi("wickspend-sms-cancel", { method: "POST", token, body: JSON.stringify(body) }),
  },
  orders: (token: string) => wickspendApi("wickspend-orders", { token }),
  notifications: (token: string) => wickspendApi("wickspend-notifications", { token }),
};
