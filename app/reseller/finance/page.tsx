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
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [accountForm, setAccountForm] = useState({ bank_code: "", account_number: "" });
  const [verifiedAccount, setVerifiedAccount] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"transactions" | "deposits" | "settlements">("transactions");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const token = getSessionToken();
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    setMessage("");
    try {
      const [s, d, t, p, bankAccount] = await Promise.all([
        wickspendApi<any>("wickspend/backend/reseller/finance/summary", { token }),
        wickspendApi<any>("wickspend/backend/reseller/finance/deposits?page=1&limit=50", { token }),
        wickspendApi<any>("wickspend/backend/reseller/finance/transactions?page=1&limit=50", { token }),
        wickspendApi<any>("wickspend/backend/reseller/settlements", { token }),
        wickspendApi<any>("wickspend/backend/reseller/settlement-account", { token }),
      ]);
      setSummary(s);
      setDeposits(Array.isArray(d?.items) ? d.items : []);
      setTransactions(Array.isArray(t?.items) ? t.items : []);
      setSettlements(p || { items: [] });
      setSettlementAccount(bankAccount?.account || null);
      setWithdrawalAmount(String(Math.max(0, Number(p?.wickspend_wallet_balance_ngn || 0))));
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [router]);

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

  async function loadSettlementBanks() {
    const token = getSessionToken(); if (!token) return;
    setBusy("banks");
    try {
      const result: any = await wickspendApi("wickspend/backend/reseller/settlement-banks", { token });
      const items = Array.isArray(result?.items) ? result.items : [];
      setBanks(items);
      if (!items.length) setMessage("Bank list is temporarily unavailable. Tap Retry to load it again.");
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(""); }
  }

  async function openSettlementForm() {
    setEditingAccount(true);
    setVerifiedAccount(null);
    setBankPickerOpen(false);
    setBankSearch("");
    setAccountForm({ bank_code: "", account_number: "" });
    if (!banks.length) await loadSettlementBanks();
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

  const payoutItems = Array.isArray(settlements?.items) ? settlements.items : [];
  const selectedBank = banks.find(bank => String(bank.code) === accountForm.bank_code);
  const bankQuery = bankSearch.trim().toLowerCase();
  const filteredBanks = bankQuery
    ? banks.filter(bank => String(bank.name || "").toLowerCase().includes(bankQuery))
    : banks;
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
        <div className="formSplit"><label className="bankField">Bank<button type="button" className={`bankSelectButton ${selectedBank ? "selected" : ""}`} aria-haspopup="dialog" aria-expanded={bankPickerOpen} disabled={busy === "banks"} onClick={() => { setBankPickerOpen(true); setBankSearch(""); if (!banks.length) void loadSettlementBanks(); }}><span>{busy === "banks" ? "Loading banks…" : selectedBank?.name || "Select bank"}</span><span className="bankSelectChevron" aria-hidden="true">⌄</span></button></label><label>Account Number<input inputMode="numeric" maxLength={10} value={accountForm.account_number} onChange={event => { setAccountForm({ ...accountForm, account_number: event.target.value.replace(/\D/g, "").slice(0, 10) }); setVerifiedAccount(null); }} placeholder="0123456789" /></label></div>
        {bankPickerOpen && <div className="bankPickerBackdrop" role="presentation" onClick={() => setBankPickerOpen(false)}><div className="bankPickerSheet" role="dialog" aria-modal="true" aria-label="Select bank" onClick={event => event.stopPropagation()}><div className="bankPickerHead"><div><span className="eyebrow">Settlement bank</span><h3>Select your bank</h3></div><button type="button" className="bankPickerClose" aria-label="Close bank list" onClick={() => setBankPickerOpen(false)}>×</button></div><div className="bankPickerSearchWrap"><span aria-hidden="true">⌕</span><input autoFocus value={bankSearch} onChange={event => setBankSearch(event.target.value)} placeholder="Search banks" aria-label="Search banks" /></div><div className="bankList">{busy === "banks" ? <div className="bankPickerEmpty">Loading Nigerian banks…</div> : filteredBanks.length ? filteredBanks.map(bank => <button type="button" key={bank.code} className={`bankOption ${String(bank.code) === accountForm.bank_code ? "active" : ""}`} onClick={() => { setAccountForm({ ...accountForm, bank_code: String(bank.code) }); setVerifiedAccount(null); setBankPickerOpen(false); setBankSearch(""); }}><span>{bank.name}</span>{String(bank.code) === accountForm.bank_code && <b aria-hidden="true">✓</b>}</button>) : <div className="bankPickerEmpty"><span>{banks.length ? "No banks match your search." : "Could not load banks."}</span>{!banks.length && <button type="button" className="secondaryButton" onClick={() => void loadSettlementBanks()}>Retry</button>}</div>}</div></div></div>}
        {verifiedAccount && <div className="verifiedAccount"><span>Account Name</span><strong>{verifiedAccount.account_name}</strong><small>{verifiedAccount.bank_name} · {verifiedAccount.account_number_masked}</small></div>}
        <div className="accountActions"><button className="secondaryButton" disabled={Boolean(busy) || !accountForm.bank_code || accountForm.account_number.length !== 10} onClick={() => verifySettlementAccount(false)}>{busy === "verify-account" ? "Verifying…" : "Verify Account"}</button>{verifiedAccount && <button className="primaryButton" disabled={Boolean(busy)} onClick={() => verifySettlementAccount(true)}>{busy === "save-account" ? "Saving…" : "Save Settlement Account"}</button>}<button className="secondaryButton" onClick={() => setEditingAccount(false)}>Cancel</button></div>
      </div>}
    </section>

    <section className="resellerCard formCard withdrawalCard">
      <div className="cardHead"><div><span className="eyebrow">Withdraw</span><h2>Withdraw Mini Store funds</h2></div><span className="status muted">{money(settlements.wickspend_wallet_balance_ngn)} balance</span></div>
      {settlementAccount ? <><div className="withdrawDestination"><span>Settlement Account</span><b>{settlementAccount.bank_name}</b><strong>{settlementAccount.account_name}</strong><small>{settlementAccount.account_number_masked}</small></div><label>Amount<input inputMode="decimal" value={withdrawalAmount} onChange={event => setWithdrawalAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="₦0" /></label><button className="primaryButton accountCta" disabled={busy === "withdraw"} onClick={withdraw}>{busy === "withdraw" ? "Submitting…" : "Withdraw"}</button></> : <div className="emptyState">Add a settlement account before requesting a withdrawal.<div><button className="primaryButton" onClick={openSettlementForm}>Add Settlement Account</button></div></div>}
    </section>

    <section className="resellerCard"><div className="tabRow"><button className={tab === "transactions" ? "active" : ""} onClick={() => setTab("transactions")}>Transactions</button><button className={tab === "deposits" ? "active" : ""} onClick={() => setTab("deposits")}>Deposits</button><button className={tab === "settlements" ? "active" : ""} onClick={() => setTab("settlements")}>Settlements</button></div>{loading ? <div className="emptyState">Loading finance data…</div> : tab === "transactions" ? <Transactions items={transactions} /> : tab === "deposits" ? <Deposits items={deposits} /> : <SettlementHistory items={payoutItems} />}</section>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="metricCard"><span>{label}</span><strong>{value}</strong></article>; }
function Transactions({ items }: { items: any[] }) { return items.length ? <div className="tableWrap"><table><thead><tr><th>Reference</th><th>Customer</th><th>Type</th><th>Purpose</th><th>Amount</th><th>Status</th></tr></thead><tbody>{items.map(x => <tr key={`${x.reference}-${x.created_at}`}><td><b>{x.reference}</b><small>{new Date(x.created_at).toLocaleString()}</small></td><td>{x.customer?.full_name || x.customer?.email || "Customer"}</td><td>{x.type}</td><td>{x.purpose || "—"}</td><td>{money(x.amount_ngn)}</td><td><span className="status muted">{x.status}</span></td></tr>)}</tbody></table></div> : <div className="emptyState">No customer wallet transactions yet.</div>; }
function Deposits({ items }: { items: any[] }) { return items.length ? <div className="tableWrap"><table><thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Status</th><th>Credited</th><th>Date</th></tr></thead><tbody>{items.map(x => <tr key={x.reference}><td><b>{x.reference}</b></td><td>{x.customer?.full_name || x.customer?.email || "Customer"}</td><td>{money(x.amount_ngn)}</td><td><span className="status muted">{x.status}</span></td><td>{x.credited ? "Yes" : "No"}</td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="emptyState">No customer deposits yet.</div>; }
function SettlementHistory({ items }: { items: any[] }) { return items.length ? <div className="tableWrap"><table><thead><tr><th>Reference</th><th>Amount</th><th>Destination</th><th>Balance after</th><th>Status</th><th>Date</th></tr></thead><tbody>{items.map(x => <tr key={x.reference}><td><b>{x.reference}</b></td><td>{money(x.amount_ngn)}</td><td>{x.destination === "bank_account" ? "Settlement account" : "WickSpend wallet"}</td><td>{money(x.balance_after_ngn)}</td><td><span className={`status ${x.status === "completed" ? "good" : x.status === "pending" ? "warn" : "muted"}`}>{x.status}</span></td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="emptyState">No settlements or withdrawals yet.</div>; }
