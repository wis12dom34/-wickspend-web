"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ResellerNav from "../ResellerNav";
import { ApiError, wickspendApi } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

type BillingCycle = "monthly" | "six_months" | "annual";
type PlanChoice = {
  cycle: BillingCycle;
  title: string;
  duration: string;
  description: string;
  badge?: string;
  price: number;
  normalPrice: number;
  monthlyPrice: number;
};

const INCLUDED_FEATURES = [
  "Full Reseller API access",
  "Mini Store access",
  "Personal reseller website",
  "Full admin dashboard access",
  "Website customization",
  "Custom logo, colors and branding",
  "Product/service management",
  "Customer and order management",
  "Live pricing",
  "Wallet integration",
  "Order tracking",
  "API documentation",
  "Support",
];

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `₦${Math.round(n).toLocaleString("en-NG")}` : "₦0";
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}

function daysRemaining(value: unknown) {
  if (!value) return 0;
  const expires = new Date(String(value)).getTime();
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, Math.ceil((expires - Date.now()) / 86_400_000));
}

function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "INSUFFICIENT_BALANCE" || error.code === "insufficient_balance") return "Insufficient balance";
    return error.code || error.message;
  }
  return error instanceof Error ? error.message : "Unable to load billing data.";
}

export default function ResellerBilling() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [selected, setSelected] = useState<PlanChoice | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const [p, pl, h, w] = await Promise.all([
        wickspendApi<any>("wickspend/backend/reseller/profile", { token }),
        wickspendApi<any>("wickspend/backend/reseller/plans"),
        wickspendApi<any>("wickspend/backend/reseller/subscription/history", { token }),
        wickspendApi<any>("wickspend/backend/wallet", { token }),
      ]);
      setProfile(p);
      setPlans(Array.isArray(pl?.items) ? pl.items : []);
      setHistory(Array.isArray(h?.items) ? h.items : []);
      setWallet(w);
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const basePlan = useMemo(
    () => plans.find((p: any) => p?.is_featured) || plans[0] || null,
    [plans],
  );

  const choices = useMemo<PlanChoice[]>(() => {
    if (!basePlan) return [];
    const monthly = Number(basePlan.monthly_price_ngn ?? 7500);
    const sixMonths = Number(basePlan.six_month_price_ngn ?? 30000);
    const annual = Number(basePlan.annual_price_ngn ?? 50000);
    return [
      {
        cycle: "monthly",
        title: "1 Month",
        duration: "1 month",
        description: "Perfect for new resellers who want to start small.",
        price: monthly,
        normalPrice: monthly,
        monthlyPrice: monthly,
      },
      {
        cycle: "six_months",
        title: "6 Months",
        duration: "6 months",
        description: "Best balance between affordability and long-term value.",
        badge: "MOST POPULAR",
        price: sixMonths,
        normalPrice: monthly * 6,
        monthlyPrice: sixMonths / 6,
      },
      {
        cycle: "annual",
        title: "1 Year",
        duration: "12 months",
        description: "Best for serious resellers who want the lowest monthly cost.",
        badge: "BEST SAVINGS",
        price: annual,
        normalPrice: monthly * 12,
        monthlyPrice: annual / 12,
      },
    ];
  }, [basePlan]);

  async function payFromWallet(choice: PlanChoice) {
    const token = getSessionToken();
    if (!token || !basePlan) return router.replace("/login");
    setBusy(true);
    setMessage("");
    try {
      const request_key =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `resub-${Date.now()}-${Math.random()}`;
      const result: any = await wickspendApi("wickspend/backend/reseller/subscription/initialize", {
        method: "POST",
        token,
        body: JSON.stringify({
          plan_code: basePlan.code,
          billing_cycle: choice.cycle,
          request_key,
          payment_method: "wallet",
        }),
      });
      if (result?.status === "active" || result?.activated === true) {
        setSelected(null);
        setSuccess({
          ...result,
          title: choice.title,
          expires_at: result.expires_at,
        });
        await load();
        return;
      }
      setMessage(result?.code || "Subscription could not be activated.");
    } catch (error) {
      const text = errorText(error);
      setMessage(text);
      if (text === "Insufficient balance") {
        setSelected(choice);
      }
    } finally {
      setBusy(false);
    }
  }

  const sub = profile?.subscription || {};
  const reseller = profile?.reseller || {};
  const remaining = daysRemaining(sub?.expires_at);
  const latestActive = history.find((x: any) => x.status === "active");
  const currentCycle = latestActive?.billing_cycle;
  const currentPlanLabel =
    currentCycle === "monthly"
      ? "1 Month Plan"
      : currentCycle === "six_months" || currentCycle === "6_months"
        ? "6 Months Plan"
        : currentCycle === "annual"
          ? "1 Year Plan"
          : reseller?.plan_code
            ? "Reseller Plan"
            : "No plan";
  const walletBalance = Number(wallet?.balance_ngn || 0);

  return (
    <main className="resellerShell subscriptionPage">
      <ResellerNav />

      <section className="subscriptionHero">
        <span className="eyebrow">WickSpend Reseller</span>
        <h1>Start Your Own Digital Services Business</h1>
        <p>Get your own reseller website, full admin control, Mini Store, API access and complete branding customization with every plan.</p>
        <div className="subscriptionPromise">
          <b>One subscription. Full reseller access. Choose how long you want to subscribe.</b>
          <span>All plans include the same reseller features. You only choose your subscription duration.</span>
        </div>
      </section>

      {message && (
        <div className={`resellerMessage ${message === "Insufficient balance" ? "error" : "error"}`}>
          {message}
        </div>
      )}

      {!loading && (
        <section className="subscriptionStatusCard">
          <div>
            <span className="eyebrow">Current Plan</span>
            <h2>{currentPlanLabel}</h2>
            <span className={`status ${sub?.active ? "good" : "muted"}`}>{sub?.active ? "Active" : "Expired"}</span>
          </div>
          <dl>
            <div><dt>Started</dt><dd>{formatDate(sub?.starts_at || latestActive?.starts_at)}</dd></div>
            <div><dt>Expires</dt><dd>{formatDate(sub?.expires_at)}</dd></div>
            <div><dt>Time remaining</dt><dd>{sub?.active ? `${remaining} days remaining` : "Renew to restore access"}</dd></div>
            <div><dt>Wallet balance</dt><dd>{money(walletBalance)}</dd></div>
          </dl>
          <a href="#subscription-plans" className="primaryButton subscriptionRenewButton">Renew Subscription</a>
        </section>
      )}

      <section className="plansSection" id="subscription-plans">
        <div className="sectionTitle subscriptionSectionTitle">
          <div>
            <span className="eyebrow">Simple pricing</span>
            <h2>Choose your subscription duration</h2>
            <p className="subtle">Same reseller access on every plan. Longer subscriptions simply cost less per month.</p>
          </div>
        </div>

        {loading ? (
          <div className="resellerLoading">Loading reseller subscription…</div>
        ) : choices.length === 3 ? (
          <div className="subscriptionPlanGrid">
            {choices.map((choice) => {
              const saving = Math.max(0, choice.normalPrice - choice.price);
              const savingPercent = choice.normalPrice > 0 ? Math.round((saving / choice.normalPrice) * 100) : 0;
              const popular = choice.cycle === "six_months";
              return (
                <article className={`subscriptionPlanCard ${popular ? "popular" : ""}`} key={choice.cycle}>
                  {choice.badge && <span className={`planBadge ${popular ? "popularBadge" : ""}`}>{choice.badge}</span>}
                  <div className="subscriptionPlanHead">
                    <h3>{choice.title}</h3>
                    <p>{choice.description}</p>
                  </div>

                  <div className="subscriptionPrice">
                    {saving > 0 && <span className="normalPrice">{money(choice.normalPrice)}</span>}
                    <strong>{money(choice.price)}</strong>
                    <small>{money(choice.monthlyPrice)}/month</small>
                  </div>

                  {saving > 0 ? (
                    <div className="savingLine">You save {money(saving)} — {savingPercent}%</div>
                  ) : (
                    <div className="savingLine neutral">Pay month-to-month</div>
                  )}

                  <button
                    className="planSubscribeButton"
                    disabled={busy}
                    onClick={() => setSelected(choice)}
                  >
                    Choose {choice.title}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="emptyState">The reseller subscription plan is not configured yet.</div>
        )}
      </section>

      <section className="allPlansInclude">
        <div className="sectionTitle">
          <div>
            <span className="eyebrow">Every plan includes</span>
            <h2>Full reseller access</h2>
          </div>
        </div>
        <div className="subscriptionFeatureGrid">
          {INCLUDED_FEATURES.map((feature) => <div key={feature}><span>✓</span>{feature}</div>)}
        </div>
      </section>

      <section className="resellerCard billingHistory">
        <div className="cardHead">
          <div><span className="eyebrow">Payments</span><h2>Subscription history</h2></div>
          <span className="status muted">{history.length} records</span>
        </div>
        {history.length ? (
          <div className="tableWrap">
            <table>
              <thead><tr><th>Reference</th><th>Plan</th><th>Duration</th><th>Amount</th><th>Status</th><th>Started</th><th>Expires</th></tr></thead>
              <tbody>
                {history.map((x: any) => (
                  <tr key={x.payment_reference}>
                    <td><b>{x.payment_reference}</b><small>{formatDate(x.created_at)}</small></td>
                    <td>Reseller</td>
                    <td>{x.billing_cycle === "monthly" ? "1 Month" : x.billing_cycle === "six_months" ? "6 Months" : "1 Year"}</td>
                    <td>{money(x.amount_ngn)}</td>
                    <td><span className={`status ${x.status === "active" ? "good" : x.status === "pending" ? "warn" : "muted"}`}>{x.status}</span></td>
                    <td>{formatDate(x.starts_at)}</td>
                    <td>{formatDate(x.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="emptyState">No reseller subscription payments yet.</div>}
      </section>

      {selected && (
        <div className="subscriptionModalBackdrop" role="presentation" onMouseDown={() => !busy && setSelected(null)}>
          <section className="subscriptionModal" role="dialog" aria-modal="true" aria-labelledby="subscription-checkout-title" onMouseDown={(e) => e.stopPropagation()}>
            <button className="subscriptionModalClose" aria-label="Close checkout" onClick={() => setSelected(null)} disabled={busy}>×</button>
            <span className="eyebrow">Confirm subscription</span>
            <h2 id="subscription-checkout-title">{selected.title} Reseller Plan</h2>
            <div className="checkoutRows">
              <div><span>Duration</span><b>{selected.duration}</b></div>
              {selected.normalPrice > selected.price && <div><span>Normal price</span><b className="strike">{money(selected.normalPrice)}</b></div>}
              {selected.normalPrice > selected.price && <div><span>Savings</span><b>{money(selected.normalPrice - selected.price)}</b></div>}
              <div><span>Total</span><strong>{money(selected.price)}</strong></div>
              <div><span>WickSpend wallet</span><b>{money(walletBalance)}</b></div>
            </div>
            {walletBalance < selected.price ? (
              <>
                <div className="insufficientBox">Insufficient balance</div>
                <Link className="primaryButton checkoutPrimary" href="/wallet">Fund Wallet</Link>
              </>
            ) : (
              <button className="primaryButton checkoutPrimary" disabled={busy} onClick={() => void payFromWallet(selected)}>
                {busy ? "Activating…" : `Pay ${money(selected.price)} from Wallet`}
              </button>
            )}
            <p className="checkoutNote">Renewing early extends from your existing expiry date, so you do not lose remaining subscription time.</p>
          </section>
        </div>
      )}

      {success && (
        <div className="subscriptionModalBackdrop">
          <section className="subscriptionModal successModal" role="dialog" aria-modal="true">
            <div className="successIcon">✓</div>
            <span className="eyebrow">Subscription Activated</span>
            <h2>{success.title} Reseller subscription is now active.</h2>
            <p>Expires: <b>{formatDate(success.expires_at || profile?.subscription?.expires_at)}</b></p>
            <div className="successActions">
              <Link className="primaryButton" href="/reseller">Go to Reseller Center</Link>
              <Link className="secondaryButton" href="/reseller/developer">View API Keys</Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
