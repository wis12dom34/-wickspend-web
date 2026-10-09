type CheckoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type MarketplaceCheckoutAttempt = { storageKey: string; requestKey: string };

// Keep uncertain purchases attached to their original order, including after reload.
// Store only an opaque session fingerprint, product ID, and request reference.
export async function prepareMarketplaceCheckout(
  token: string,
  productId: string,
  quantity: number,
  newKey: () => string,
  storage?: CheckoutStorage,
): Promise<MarketplaceCheckoutAttempt> {
  try {
    storage = storage || window.localStorage;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const scope = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const storageKey = `wickspend:marketplace:checkout:${scope}:${encodeURIComponent(productId)}:${quantity}`;
    const requestKey = storage.getItem(storageKey) || newKey();
    // Fail before submitting if storage cannot preserve the retry reference.
    storage.setItem(storageKey, requestKey);
    return { storageKey, requestKey };
  } catch {
    throw new Error("Unable to verify this checkout. Please try again.");
  }
}

export function finishMarketplaceCheckout(
  attempt: MarketplaceCheckoutAttempt,
  result: unknown,
  storage: CheckoutStorage = window.localStorage,
) {
  if (!result || typeof result !== "object") return;
  const value = result as { ok?: boolean; status?: string; refunded?: boolean; provider_pending?: boolean };
  const terminal = value.ok === true && value.provider_pending !== true &&
    (value.refunded === true || /^(fulfilled|completed|delivered|refunded)$/.test(String(value.status || "").toLowerCase()));
  if (terminal && storage.getItem(attempt.storageKey) === attempt.requestKey) {
    storage.removeItem(attempt.storageKey);
  }
}
