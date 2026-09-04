"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

const money = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? `₦${n.toLocaleString()}` : "—";
};

export default function Wallet() {
  const [balance, setBalance] = useState("—");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading wallet…");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = getSessionToken();
      if (!token) {
        setMessage("Please sign in to view your wallet.");
        return;
      }
      try {
        const [wallet, tx]: any[] = await Promise.all([api.wallet.get(token), api.wallet.transactions(token)]);
        if (cancelled) return;
        const rawBalance = wallet?.balance_ngn ?? wallet?.wallet_balance_ngn ?? wallet?.balance ?? wallet?.wallet?.balance_ngn ?? wallet?.data?.balance_ngn ?? wallet?.data?.balance;
        setBalance(money(rawBalance));
        const list = Array.isArray(tx) ? tx : (tx?.transactions || tx?.items || tx?.data || []);
        setTransactions(Array.isArray(list) ? list : []);
        setMessage("");
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load wallet");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <PageShell title="Wallet" subtitle="Balance and funding">
      <section className="walletHero">
        <p>Available Balance <span>◉</span></p>
        <strong>{hidden ? "••••••" : balance}</strong>
        <small>Preferred Currency&nbsp; • &nbsp;NGN</small>
        <div className="walletHeroActions">
          <Link href="/add-funds" className="walletAddFunds">Add Funds</Link>
          <button type="button" className="walletHide" onClick={() => setHidden((value) => !value)}>{hidden ? "Show" : "Hide"}</button>
        </div>
      </section>

      <section className="walletQuickGrid">
        <Link href="/add-funds" className="walletQuickCard"><span>＋</span><b>Add Funds</b></Link>
        <Link href="/orders" className="walletQuickCard"><span>↗</span><b>Orders</b></Link>
      </section>

      <section>
        <div className="walletSectionHeading"><h2>Recent Transactions</h2><span>{transactions.length ? `${transactions.length} items` : ""}</span></div>
        <div className="walletTransactions">
          {transactions.length > 0 ? transactions.map((tx: any, i) => {
            const amount = tx.amount_ngn ?? tx.final_amount_ngn;
            const type = tx.type || tx.kind || tx.category || tx.description || "Transaction";
            const status = tx.status || "";
            const date = tx.created_at || tx.date || tx.timestamp;
            return (
              <div className="walletTransaction" key={tx.id || tx.reference || i}>
                <span className="walletTransactionIcon">{Number(amount) >= 0 ? "↓" : "↑"}</span>
                <div className="walletTransactionCopy">
                  <b>{type}</b>
                  <small>{status || (date ? new Date(date).toLocaleDateString() : "Wallet activity")}</small>
                </div>
                <strong>{amount !== undefined ? money(amount) : "—"}</strong>
              </div>
            );
          }) : (
            <div className="walletEmptyState"><span>💳</span><b>No transactions yet</b><p>{message || "Your wallet activity will appear here."}</p></div>
          )}
        </div>
      </section>

      {message && transactions.length > 0 && <p className="walletMessage">{message}</p>}
    </PageShell>
  );
}
