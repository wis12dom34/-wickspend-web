"use client";

export type StoreRentalPeriod = {
  duration_minutes: number;
  duration_label?: string;
  price_ngn?: number;
  is_available?: boolean;
};

export type StoreRentalService = {
  service_code: string;
  service_name?: string;
  country_code?: string;
  country_name?: string;
  country_flag?: string;
  icon_url?: string;
  available?: boolean;
  periods?: StoreRentalPeriod[];
};

export type StoreRental = Record<string, any> & {
  reference?: string;
  rental_id?: string;
  provider_order_id?: string;
  phone_number?: string;
  service_code?: string;
  service_name?: string;
  country_code?: string;
  country_name?: string;
  status?: string;
  expires_at?: string;
  created_at?: string;
};

export class StoreRentalError extends Error {
  status: number;
  code: string;
  payload: Record<string, any>;
  constructor(status: number, code: string, payload: Record<string, any>) {
    super(storeRentalMessage(code, status));
    this.name = "StoreRentalError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function storeToken(slug: string) {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(`wickstore_session_${slug}`) || ""; } catch { return ""; }
}

export function storeRentalMessage(code = "", status = 0) {
  const key = String(code).toUpperCase();
  if (key === "INSUFFICIENT_BALANCE" || status === 402) return "Your wallet balance is too low for this rental.";
  if (key === "NUMBER_UNAVAILABLE" || key === "RENTAL_UNAVAILABLE") return "That rental is no longer available. Please choose another option.";
  if (key === "SERVICE_DISABLED" || key === "RENTALS_DISABLED") return "Rent Number is not available in this store right now.";
  if (key === "RENTAL_EXPIRED") return "This rental has expired.";
  if (key === "SMS_NOT_RECEIVED") return "No SMS has arrived yet. Please check again shortly.";
  if (key === "UNAUTHORIZED" || key === "INVALID_OR_EXPIRED_SESSION" || status === 401) return "Your session has expired. Please sign in again.";
  if (key === "PROVIDER_TIMEOUT") return "The provider is still confirming this request. Please check My Rentals before trying again.";
  if (key === "STORE_NOT_FOUND" || key === "STORE_UNAVAILABLE" || status === 404) return "This store or rental service is unavailable right now.";
  return "Unable to rent this number right now. Please try again.";
}

export async function storeRentalRequest<T = any>(slug: string, path: string, init: RequestInit = {}) {
  const token = storeToken(slug);
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`/webhook/wickspend/store/${path}`, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new StoreRentalError(response.status, String(payload?.code || payload?.error || "RENTAL_FAILED"), payload);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof StoreRentalError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new StoreRentalError(504, "PROVIDER_TIMEOUT", {});
    }
    throw new StoreRentalError(503, "SERVICE_UNAVAILABLE", {});
  } finally {
    clearTimeout(timeout);
  }
}

export function newStoreRentalRequestKey(slug: string) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `store-rental-${slug}-${id}`;
}

export function rentalReference(rental: StoreRental | null | undefined) {
  return String(rental?.reference || rental?.rental_id || rental?.id || "");
}

export function rentalExpiry(rental: StoreRental | null | undefined) {
  return String(rental?.expires_at || rental?.expiry_at || rental?.expiry || "");
}

export function rentalMessages(rental: StoreRental | null | undefined) {
  const value = rental?.messages || rental?.sms || rental?.data?.messages || [];
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function moneyNgn(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount)
    : "—";
}

export function remainingLabel(expiresAt: string, now = Date.now()) {
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) return "—";
  const seconds = Math.max(0, Math.floor((end - now) / 1000));
  if (!seconds) return "Expired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return days ? `${days}d ${hours}h ${minutes}m` : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
