"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

const money = (value: any) => {
  const n = Number(value);
  return value !== undefined && value !== null && Number.isFinite(n) ? `₦${n.toLocaleString()}` : "—";
};
const dateLabel = (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};

type TxState = "loading" | "ready" | "error" | "signed-out";

export default function Wallet() {
  const [balance, setBalance] = useState("—");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txState, setTxState] = useState<TxState>("loading");
  const [message, setMessage] = useState("Loading wallet…");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = getSessionToken();
      if (!token) {
        setBalance("—");
        setTransactions([]);
        setTxState("signed-out");
        setMessage("Please sign in to view your wallet.");
        return;
      }
      setTxState("loading");
      setMessage("Loading wallet…");
      const [walletResult, txResult] = await Promise.allSettled([api.wallet.get(token), api.wallet.transactions(token)]);
      if (cancelled) return;
      if (walletResult.status === "fulfilled") {
        const wallet: any = walletResult.value;
        const rawBalance = wallet?.balance_ngn ?? wallet?.wallet_balance_ngn ?? wallet?.balance ?? wallet?.wallet?.balance_ngn ?? wallet?.data?.balance_ngn ?? wallet?.data?.balance;
        setBalance(money(rawBalance));
      } else setBalance("—");
      if (txResult.status === "fulfilled") {
        const tx: any = txResult.value;
        const list = Array.isArray(tx) ? tx : (tx?.transactions || tx?.items || tx?.data || []);
        setTransactions(Array.isArray(list) ? list : []);
        setTxState("ready");
      } else {
        setTransactions([]);
        setTxState("error");
      }
      if (walletResult.status === "rejected" && txResult.status === "rejected") {
        const reason = walletResult.reason;
        setMessage(reason instanceof Error ? reason.message : "Unable to load wallet");
      } else if (walletResult.status === "rejected") setMessage("Wallet balance is temporarily unavailable.");
      else if (txResult.status === "rejected") setMessage("Recent transactions are temporarily unavailable.");
      else setMessage("");
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const emptyTitle = txState === "loading" ? "Loading transactions…" : txState === "error" ? "Transactions unavailable" : txState === "signed-out" ? "Sign in to view activity" : "No transactions yet";
  const emptyCopy = txState === "loading" ? "Fetching your latest wallet activity." : txState === "error" ? "We couldn’t load your recent wallet activity right now." : txState === "signed-out" ? "Your wallet activity will appear here after you sign in." : "Your wallet activity will appear here.";

  return (
    <PageShell title="Wallet" subtitle="Balance and funding">
      <section className="walletHero">
        <p>Available Balance <span>◉</span></p>
        <strong>{hidden ? "••••••" : balance}</strong>
        <small>Preferred Currency&nbsp; • &nbsp;NGN</small>
        <div className="walletHeroActions">
          <Link href="/add-funds" className="walletAddFunds">Add Funds</Link>
          <button type="button" className="walletHide" aria-pressed={hidden} onClick={() => setHidden((value) => !value)}>{hidden ? "Show" : "Hide"}</button>
        </div>
      </section>

      <section className="walletQuickGrid">
        <Link href="/add-funds" className="walletQuickCard"><span>＋</span><b>Add Funds</b></Link>
        <Link href="/orders" className="walletQuickCard"><span>↗</span><b>Orders</b></Link>
      </section>

      <section>
        <div className="walletSectionHeading"><h2>Recent Transactions</h2><span>{transactions.length ? `${transactions.length} items` : ""}</span></div>
        <div className="walletTransactions" aria-busy={txState === "loading"}>
          {transactions.length > 0 ? transactions.map((tx: any, i) => {
            const amount = tx.amount_ngn ?? tx.final_amount_ngn;
            const amountNumber = Number(amount);
            const type = tx.type || tx.kind || tx.category || tx.description || "Transaction";
            const status = tx.status || "";
            const date = dateLabel(tx.created_at || tx.date || tx.timestamp);
            return (
              <div className="walletTransaction" key={tx.id || tx.reference || i}>
                <span className="walletTransactionIcon">{Number.isFinite(amountNumber) && amountNumber < 0 ? "↑" : "↓"}</span>
                <div className="walletTransactionCopy">
                  <b>{type}</b>
                  <small>{status || date || "Wallet activity"}</small>
                </div>
                <strong>{money(amount)}</strong>
              </div>
            );
          }) : (
            <div className="walletEmptyState"><span>💳</span><b>{emptyTitle}</b><p>{emptyCopy}</p></div>
          )}
        </div>
      </section>

      {message && (transactions.length > 0 || txState === "error") && <p className="walletMessage" role="status">{message}</p>}
    </PageShell>
  );
}
