"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResellerNav from "../ResellerNav";
import { ApiError, wickspendApi } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}` : "₦0";
}
function errorText(error: unknown) {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      SETTLEMENT_ACCOUNT_REQUIRED: "Add a settlement account before requesting a withdrawal.",
      ACCOUNT_VERIFICATION_FAILED: "We could not verify that bank account. Check the details and try again.",
      INVALID_BANK_ACCOUNT: "Enter a valid Nigerian bank and 10-digit account number.",
      INSUFFICIENT_BALANCE: "Your WickSpend wallet balance is too low for this withdrawal.",
      NO_AVAILABLE_EARNINGS: "You do not have available reseller earnings yet.",
      INVALID_AMOUNT: "Enter a withdrawal amount of at least ₦100.",
      IDEMPOTENCY_CONFLICT: "That withdrawal request could not be safely repeated.",
    };
    return messages[error.code || ""] || error.message;
  }
  return error instanceof Error ? error.message : "Request failed.";
}
function requestKey(prefix = "settlement") {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random()}`;
}

export default function ResellerFinance() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>({});
  const [settlements, setSettlements] = useState<any>({ items: [] });
  const [settlementAccount, setSettlementAccount] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [accountForm, setAccountForm] = useState({ bank_code: "", account_number: "" });
  const [verifiedAccount, setVerifiedAccount] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [manualRequests, setManualRequests] = useState<any[]>([]);
  const [manualCounts, setManualCounts] = useState<any>({ pending: 0, approved: 0, rejected: 0 });
  const [manualFilter, setManualFilter] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const [paymentAccount, setPaymentAccount] = useState({ bank_name: "", account_number: "", account_name: "", enabled: false });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"transactions" | "deposits" | "settlements">("transactions");
  const [busy, setBusy] = useState("");
  const [manualBusy, setManualBusy] = useState("");

  const load = useCallback(async () => {
    const token = getSessionToken();
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    setMessage("");
    try {
      const [s, d, t, p, a, m, bankAccount] = await Promise.all([
        wickspendApi<any>("wickspend/backend/reseller/finance/summary", { token }),
        wickspendApi<any>("wickspend/backend/reseller/finance/deposits?page=1&limit=50", { token }),
        wickspendApi<any>("wickspend/backend/reseller/finance/transactions?page=1&limit=50", { token }),
        wickspendApi<any>("wickspend/backend/reseller/settlements", { token }),
        wickspendApi<any>("wickspend/backend/reseller/manual-funding/account", { token }),
        wickspendApi<any>(`wickspend/backend/reseller/manual-funding/requests${manualFilter ? `?status=${manualFilter}` : ""}`, { token }),
        wickspendApi<any>("wickspend/backend/reseller/settlement-account", { token }),
      ]);
      setSummary(s);
      setDeposits(Array.isArray(d?.items) ? d.items : []);
      setTransactions(Array.isArray(t?.items) ? t.items : []);
      setSettlements(p || { items: [] });
      setSettlementAccount(bankAccount?.account || null);
      setWithdrawalAmount(String(Math.max(0, Number(p?.wickspend_wallet_balance_ngn || 0))));
      const account = a?.account || {};
      setPaymentAccount({ bank_name: account.bank_name || "", account_number: account.account_number || "", account_name: account.account_name || "", enabled: Boolean(account.enabled) });
      setManualRequests(Array.isArray(m?.items) ? m.items : []);
      setManualCounts(m?.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [router, manualFilter]);

  useEffect(() => { load(); }, [load]);

  async function claim() {
    const available = Number(settlements?.available_earnings_ngn || 0);
    if (!(available > 0) || !window.confirm(`Move ${money(available)} of earned reseller profit into your WickSpend wallet?`)) return;
    const token = getSessionToken(); if (!token) return;
    setBusy("claim"); setMessage("");
    try {
      const result: any = await wickspendApi("wickspend/backend/reseller/settlements/claim", { method: "POST", token, body: JSON.stringify({ request_key: requestKey("wallet-settlement") }) });
      setMessage(`Settlement completed: ${money(result?.amount_ngn)} credited to your WickSpend wallet.`);
      await load();
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(""); }
  }

  async function openSettlementForm() {
    setEditingAccount(true);
    setVerifiedAccount(null);
    setAccountForm({ bank_code: "", account_number: "" });
    if (banks.length) return;
    const token = getSessionToken(); if (!token) return;
    setBusy("banks");
    try {
      const result: any = await wickspendApi("wickspend/backend/reseller/settlement-banks", { token });
      setBanks(Array.isArray(result?.items) ? result.items : []);
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(""); }
  }

  async function verifySettlementAccount(save = false) {
    const token = getSessionToken(); if (!token) return;
    if (save && !window.confirm("Confirm this account as your Mini Store withdrawal destination?")) return;
    setBusy(save ? "save-account" : "verify-account"); setMessage("");
    try {
      const result: any = await wickspendApi("wickspend/backend/reseller/settlement-account/verify", {
        method: "POST", token, body: JSON.stringify({ ...accountForm, save }),
      });
      setVerifiedAccount(result?.account || null);
      if (save) {
        setMessage("Settlement account saved and active.");
        setEditingAccount(false);
        await load();
      }
    } catch (error) { setVerifiedAccount(null); setMessage(errorText(error)); }
    finally { setBusy(""); }
  }

  async function removeSettlementAccount() {
    if (!window.confirm("Remove this settlement account? You will not be able to withdraw until another account is added.")) return;
    const token = getSessionToken(); if (!token) return;
    setBusy("remove-account"); setMessage("");
    try {
      await wickspendApi("wickspend/backend/reseller/settlement-account/remove", { method: "POST", token, body: "{}" });
      setMessage("Settlement account removed.");
      setEditingAccount(false);
      await load();
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(""); }
  }

  async function withdraw() {
    const amount = Number(withdrawalAmount);
    if (!settlementAccount) { setMessage("Add a settlement account before requesting a withdrawal."); return; }
    if (!(amount >= 100)) { setMessage("Enter a withdrawal amount of at least ₦100."); return; }
    if (!window.confirm(`Withdraw ${money(amount)} to ${settlementAccount.bank_name} ${settlementAccount.account_number_masked}?`)) return;
    const token = getSessionToken(); if (!token) return;
    setBusy("withdraw"); setMessage("");
    try {
      const result: any = await wickspendApi("wickspend/backend/reseller/withdrawals", {
        method: "POST", token, body: JSON.stringify({ amount_ngn: amount, request_key: requestKey("bank-withdrawal") }),
      });
      setMessage(`Withdrawal requested: ${money(result?.amount_ngn)} is now pending.`);
      await load();
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(""); }
  }

  async function savePaymentAccount() {
    const token = getSessionToken(); if (!token) return;
    setManualBusy("account"); setMessage("");
    try {
      await wickspendApi("wickspend/backend/reseller/manual-funding/account", { method: "POST", token, body: JSON.stringify(paymentAccount) });
      setMessage(paymentAccount.enabled ? "Manual transfer account saved." : "Manual bank transfer disabled.");
      await load();
    } catch (error) { setMessage(errorText(error)); }
    finally { setManualBusy(""); }
  }

  async function reviewRequest(item: any, action: "approve" | "reject") {
    const token = getSessionToken(); if (!token) return;
    let reason = "";
    if (action === "approve" && !window.confirm(`Approve ${money(item.amount_ngn)} for ${item.customer_name || item.customer_email}? The customer wallet will be credited immediately.`)) return;
    if (action === "reject") {
      const value = window.prompt("Optional rejection reason", "");
      if (value === null) return;
      reason = value.trim();
    }
    setManualBusy(`${action}-${item.id}`); setMessage("");
    try {
      const result: any = await wickspendApi(`wickspend/backend/reseller/manual-funding/${action}`, {
        method: "POST", token, body: JSON.stringify({ request_id: item.id, request_key: `manual-review-${requestKey()}`, reason }),
      });
      setMessage(result?.duplicate ? `Request was already ${action === "approve" ? "approved" : "rejected"}.` : `Manual funding request ${action === "approve" ? "approved and credited" : "rejected"}.`);
      await load();
    } catch (error) { setMessage(errorText(error)); }
    finally { setManualBusy(""); }
  }

  const payoutItems = Array.isArray(settlements?.items) ? settlements.items : [];
  const success = /completed|saved|removed|requested|approved|rejected|already|active/i.test(message);

  return <main className="resellerShell">
    <ResellerNav />
    <header className="resellerTopbar"><div><span className="eyebrow">Finance</span><h1>Money movement</h1><p>Customer funding, wallet liability, withdrawals and reseller profit.</p></div><button className="secondaryButton" onClick={load}>Refresh</button></header>
    {message && <div className={`resellerMessage ${success ? "success" : "error"}`}>{message}</div>}
    <section className="resellerStats"><Metric label="Customer wallet liability" value={money(summary.customer_wallet_liability_ngn)} /><Metric label="Successful funding" value={money(summary.successful_funding_ngn)} /><Metric label="Earned profit" value={money(settlements.available_earnings_ngn ?? summary.earned_profit_ngn)} /><Metric label="Withdrawal balance" value={money(settlements.wickspend_wallet_balance_ngn)} /></section>
    <section className="resellerGrid three"><Metric label="Completed debits" value={money(summary.completed_customer_debits_ngn)} /><Metric label="Refund credits" value={money(summary.refund_credits_ngn)} /><Metric label="Pending funding" value={money(summary.pending_funding_ngn)} /></section>

    <section className="resellerCard settlementCard"><div><span className="eyebrow">Profit settlement</span><h2>{money(settlements.available_earnings_ngn)} available</h2><p className="subtle">Move earned Mini Store profit into your existing WickSpend wallet before withdrawing to your bank.</p></div><div className="settlementAction"><div><span>Previously settled</span><b>{money(settlements.settled_earnings_ngn)}</b></div><button className="primaryButton" disabled={busy === "claim" || Number(settlements.available_earnings_ngn || 0) <= 0} onClick={claim}>{busy === "claim" ? "Settling…" : "Move to withdrawal balance"}</button></div></section>

    <section className="resellerCard formCard settlementAccountCard">
      <div className="cardHead"><div><span className="eyebrow">Settlement Account</span><h2>{settlementAccount ? settlementAccount.account_name : "Add your withdrawal account"}</h2><p className="subtle">This private account is used only for your Mini Store withdrawals.</p></div><span className={`status ${settlementAccount ? "good" : "muted"}`}>{settlementAccount ? "Active" : "Not added"}</span></div>
      {settlementAccount && !editingAccount && <div className="settlementAccountSummary"><div><span>Bank Name</span><b>{settlementAccount.bank_name}</b></div><div><span>Account Number</span><b>{settlementAccount.account_number_masked}</b></div><div><span>Account Name</span><b>{settlementAccount.account_name}</b></div><div className="accountActions"><button className="secondaryButton" onClick={openSettlementForm}>Change Account</button><button className="dangerButton" disabled={busy === "remove-account"} onClick={removeSettlementAccount}>{busy === "remove-account" ? "Removing…" : "Remove Account"}</button></div></div>}
      {!settlementAccount && !editingAccount && <button className="primaryButton accountCta" onClick={openSettlementForm}>Add Settlement Account</button>}
      {editingAccount && <div className="settlementAccountForm">
        <div className="formSplit"><label>Bank<select value={accountForm.bank_code} onChange={event => { setAccountForm({ ...accountForm, bank_code: event.target.value }); setVerifiedAccount(null); }}><option value="">{busy === "banks" ? "Loading banks…" : "Select bank"}</option>{banks.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></label><label>Account Number<input inputMode="numeric" maxLength={10} value={accountForm.account_number} onChange={event => { setAccountForm({ ...accountForm, account_number: event.target.value.replace(/\D/g, "").slice(0, 10) }); setVerifiedAccount(null); }} placeholder="0123456789" /></label></div>
        {verifiedAccount && <div className="verifiedAccount"><span>Account Name</span><strong>{verifiedAccount.account_name}</strong><small>{verifiedAccount.bank_name} · {verifiedAccount.account_number_masked}</small></div>}
        <div className="accountActions"><button className="secondaryButton" disabled={Boolean(busy) || !accountForm.bank_code || accountForm.account_number.length !== 10} onClick={() => verifySettlementAccount(false)}>{busy === "verify-account" ? "Verifying…" : "Verify Account"}</button>{verifiedAccount && <button className="primaryButton" disabled={Boolean(busy)} onClick={() => verifySettlementAccount(true)}>{busy === "save-account" ? "Saving…" : "Save Settlement Account"}</button>}<button className="secondaryButton" onClick={() => setEditingAccount(false)}>Cancel</button></div>
      </div>}
    </section>

    <section className="resellerCard formCard withdrawalCard">
      <div className="cardHead"><div><span className="eyebrow">Withdraw</span><h2>Withdraw Mini Store funds</h2></div><span className="status muted">{money(settlements.wickspend_wallet_balance_ngn)} balance</span></div>
      {settlementAccount ? <><div className="withdrawDestination"><span>Settlement Account</span><b>{settlementAccount.bank_name}</b><strong>{settlementAccount.account_name}</strong><small>{settlementAccount.account_number_masked}</small></div><label>Amount<input inputMode="decimal" value={withdrawalAmount} onChange={event => setWithdrawalAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="₦0" /></label><button className="primaryButton accountCta" disabled={busy === "withdraw"} onClick={withdraw}>{busy === "withdraw" ? "Submitting…" : "Withdraw"}</button></> : <div className="emptyState">Add a settlement account before requesting a withdrawal.<div><button className="primaryButton" onClick={openSettlementForm}>Add Settlement Account</button></div></div>}
    </section>

    <section className="resellerCard formCard manualAccountCard"><div className="cardHead"><div><span className="eyebrow">Manual bank transfer</span><h2>Customer payment account</h2><p className="subtle">Only this account is shown to Mini Store customers paying manually.</p></div><span className={`status ${paymentAccount.enabled ? "good" : "muted"}`}>{paymentAccount.enabled ? "Enabled" : "Disabled"}</span></div><div className="manualAccountGrid"><label>Bank<input value={paymentAccount.bank_name} onChange={e => setPaymentAccount({ ...paymentAccount, bank_name: e.target.value })} placeholder="OPay" /></label><label>Account number<input inputMode="numeric" value={paymentAccount.account_number} onChange={e => setPaymentAccount({ ...paymentAccount, account_number: e.target.value.replace(/\D/g, "") })} placeholder="1234567890" /></label><label>Account name<input value={paymentAccount.account_name} onChange={e => setPaymentAccount({ ...paymentAccount, account_name: e.target.value })} placeholder="John Digital Services" /></label></div><label className="toggleLine"><input type="checkbox" checked={paymentAccount.enabled} onChange={e => setPaymentAccount({ ...paymentAccount, enabled: e.target.checked })} /><span>Enable manual bank transfer in my Mini Store</span></label><button className="primaryButton" disabled={manualBusy === "account"} onClick={savePaymentAccount}>{manualBusy === "account" ? "Saving…" : "Save payment account"}</button></section>

    <section className="resellerCard"><div className="cardHead"><div><span className="eyebrow">Customer deposits</span><h2>Manual Funding Requests</h2></div><button className="secondaryButton" onClick={load}>Refresh</button></div><div className="tabRow manualTabs"><button className={manualFilter === "pending" ? "active" : ""} onClick={() => setManualFilter("pending")}>Pending ({Number(manualCounts.pending || 0)})</button><button className={manualFilter === "approved" ? "active" : ""} onClick={() => setManualFilter("approved")}>Approved ({Number(manualCounts.approved || 0)})</button><button className={manualFilter === "rejected" ? "active" : ""} onClick={() => setManualFilter("rejected")}>Rejected ({Number(manualCounts.rejected || 0)})</button><button className={manualFilter === "" ? "active" : ""} onClick={() => setManualFilter("")}>All</button></div>{loading ? <div className="emptyState">Loading manual funding requests…</div> : <ManualRequests items={manualRequests} busy={manualBusy} onReview={reviewRequest} />}</section>
    <section className="resellerCard"><div className="tabRow"><button className={tab === "transactions" ? "active" : ""} onClick={() => setTab("transactions")}>Transactions</button><button className={tab === "deposits" ? "active" : ""} onClick={() => setTab("deposits")}>Deposits</button><button className={tab === "settlements" ? "active" : ""} onClick={() => setTab("settlements")}>Settlements</button></div>{loading ? <div className="emptyState">Loading finance data…</div> : tab === "transactions" ? <Transactions items={transactions} /> : tab === "deposits" ? <Deposits items={deposits} /> : <SettlementHistory items={payoutItems} />}</section>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="metricCard"><span>{label}</span><strong>{value}</strong></article>; }
function ManualRequests({ items, busy, onReview }: { items: any[]; busy: string; onReview: (item: any, action: "approve" | "reject") => void }) { return items.length ? <div className="tableWrap"><table><thead><tr><th>Customer</th><th>Amount</th><th>Sender / bank</th><th>Reference</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(x => <tr key={x.id}><td><b>{x.customer_name || "Customer"}</b><small>{x.customer_email}</small></td><td><b>{money(x.amount_ngn)}</b></td><td>{x.sender_name}<small>{x.sender_bank}</small></td><td><b>{x.transaction_reference || "Not provided"}</b><small>{x.payment_date_time ? new Date(x.payment_date_time).toLocaleString() : "Payment time unavailable"}</small></td><td>{new Date(x.submitted_at).toLocaleString()}</td><td><span className={`status ${x.status === "APPROVED" ? "good" : x.status === "PENDING" ? "warn" : "muted"}`}>{x.status}</span>{x.rejection_reason && <small>{x.rejection_reason}</small>}</td><td>{x.status === "PENDING" ? <div className="reviewActions"><button className="primaryButton compact" disabled={Boolean(busy)} onClick={() => onReview(x, "approve")}>{busy === `approve-${x.id}` ? "Approving…" : "Approve"}</button><button className="dangerButton" disabled={Boolean(busy)} onClick={() => onReview(x, "reject")}>{busy === `reject-${x.id}` ? "Rejecting…" : "Reject"}</button></div> : "—"}</td></tr>)}</tbody></table></div> : <div className="emptyState">No manual funding requests in this state.</div>; }
function Transactions({ items }: { items: any[] }) { return items.length ? <div className="tableWrap"><table><thead><tr><th>Reference</th><th>Customer</th><th>Type</th><th>Purpose</th><th>Amount</th><th>Status</th></tr></thead><tbody>{items.map(x => <tr key={`${x.reference}-${x.created_at}`}><td><b>{x.reference}</b><small>{new Date(x.created_at).toLocaleString()}</small></td><td>{x.customer?.full_name || x.customer?.email || "Customer"}</td><td>{x.type}</td><td>{x.purpose || "—"}</td><td>{money(x.amount_ngn)}</td><td><span className="status muted">{x.status}</span></td></tr>)}</tbody></table></div> : <div className="emptyState">No customer wallet transactions yet.</div>; }
function Deposits({ items }: { items: any[] }) { return items.length ? <div className="tableWrap"><table><thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Status</th><th>Credited</th><th>Date</th></tr></thead><tbody>{items.map(x => <tr key={x.reference}><td><b>{x.reference}</b></td><td>{x.customer?.full_name || x.customer?.email || "Customer"}</td><td>{money(x.amount_ngn)}</td><td><span className="status muted">{x.status}</span></td><td>{x.credited ? "Yes" : "No"}</td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="emptyState">No customer deposits yet.</div>; }
function SettlementHistory({ items }: { items: any[] }) { return items.length ? <div className="tableWrap"><table><thead><tr><th>Reference</th><th>Amount</th><th>Destination</th><th>Balance after</th><th>Status</th><th>Date</th></tr></thead><tbody>{items.map(x => <tr key={x.reference}><td><b>{x.reference}</b></td><td>{money(x.amount_ngn)}</td><td>{x.destination === "bank_account" ? "Settlement account" : "WickSpend wallet"}</td><td>{money(x.balance_after_ngn)}</td><td><span className={`status ${x.status === "completed" ? "good" : x.status === "pending" ? "warn" : "muted"}`}>{x.status}</span></td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="emptyState">No settlements or withdrawals yet.</div>; }
