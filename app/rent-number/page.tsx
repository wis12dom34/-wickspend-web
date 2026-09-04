"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";

type Duration = 1440 | 4320 | 10080 | 20160 | 43200;

function token() {
  return localStorage.getItem("wickspend_session_token") || localStorage.getItem("wickspend_token") || "";
}

function referenceOf(value: any) {
  return String(value?.reference || value?.rental?.reference || value?.data?.reference || "");
}

export default function RentNumber() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [serviceCode, setServiceCode] = useState("");
  const [duration, setDuration] = useState<Duration>(1440);
  const [rental, setRental] = useState<any>(null);
  const [message, setMessage] = useState("Loading rental options…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.rentals.catalog().then((data: any) => {
      const list = Array.isArray(data) ? data : (data?.services || data?.items || data?.data || []);
      setCatalog(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list[0]) setServiceCode(String(list[0].service_code || list[0].code || list[0].id || ""));
      setMessage(Array.isArray(list) && list.length ? "" : "No rental options are available right now.");
    }).catch((err) => setMessage(err instanceof Error ? err.message : "Unable to load rentals"));
  }, []);

  async function createRental(e: FormEvent) {
    e.preventDefault();
    const session = token();
    if (!session) return setMessage("Please sign in first.");
    if (!serviceCode) return setMessage("Choose a service first.");
    setBusy(true);
    setMessage("Creating rental…");
    try {
      const result: any = await api.rentals.create(session, { service_code: serviceCode, duration_minutes: duration, country_code: "US", auto_renew: false });
      setRental(result?.rental || result?.data || result);
      setMessage("Rental created successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create rental");
    } finally { setBusy(false); }
  }

  async function refresh() {
    const reference = referenceOf(rental);
    const session = token();
    if (!reference || !session) return;
    setBusy(true);
    try {
      const result: any = await api.rentals.status(session, reference);
      setRental(result?.rental || result?.data || result);
      setMessage("");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to refresh rental"); }
    finally { setBusy(false); }
  }

  async function extend() {
    const reference = referenceOf(rental);
    const session = token();
    if (!reference || !session) return;
    setBusy(true);
    try {
      const result: any = await api.rentals.extend(session, reference);
      setRental(result?.rental || result?.data || result);
      setMessage("Rental extended successfully.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to extend rental"); }
    finally { setBusy(false); }
  }

  async function cancel() {
    const reference = referenceOf(rental);
    const session = token();
    if (!reference || !session) return;
    setBusy(true);
    try {
      await api.rentals.cancel(session, reference);
      setMessage("Rental cancelled. Any eligible refund is handled by the backend policy.");
      await refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to cancel rental"); }
    finally { setBusy(false); }
  }

  const reference = referenceOf(rental);
  const phone = rental?.phone_number || rental?.number || rental?.phone || "";
  const status = rental?.status || "Active";
  const sms = rental?.messages || rental?.sms || rental?.data?.messages || [];
  const messages = Array.isArray(sms) ? sms : sms ? [sms] : [];
  const ended = /cancel|expired|complete|refunded/i.test(String(status));

  return (
    <PageShell title="Rent Number" subtitle="Longer-term number rentals">
      {!rental ? (
        <form className="panel formGrid" onSubmit={createRental}>
          <div className="field"><label>Country</label><div className="glassCard">🇺🇸 USA</div></div>
          <div className="field"><label>Service</label><select value={serviceCode} onChange={(e) => setServiceCode(e.target.value)}>
            {catalog.map((item: any, index) => {
              const code = String(item.service_code || item.code || item.id || index);
              return <option key={code} value={code}>{item.name || item.service_name || item.title || code}</option>;
            })}
          </select></div>
          <div className="field"><label>Duration</label><select value={duration} onChange={(e) => setDuration(Number(e.target.value) as Duration)}>
            <option value={1440}>1 day</option><option value={4320}>3 days</option><option value={10080}>7 days</option><option value={20160}>14 days</option><option value={43200}>30 days</option>
          </select></div>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Renting…" : "Rent number"}</button>
        </form>
      ) : (
        <div className="panel">
          <p className="eyebrow">{status}</p>
          <h2>{phone || "Rental number"}</h2>
          {reference && <small>Ref: {reference}</small>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button className="secondaryButton" disabled={busy} onClick={refresh}>Refresh SMS</button>
            {!ended && <button className="secondaryButton" disabled={busy} onClick={extend}>Extend</button>}
            {!ended && <button className="secondaryButton" disabled={busy} onClick={cancel}>Cancel rental</button>}
          </div>
          <div style={{ marginTop: 18 }}><h3>SMS</h3>{messages.length ? <div className="list">{messages.map((item: any, index) => <div className="listItem" key={item.id || index}><div><b>{item.sender || item.from || "Message"}</b><br/><span>{item.text || item.message || item.code || String(item)}</span></div></div>)}</div> : <p>No SMS received yet. Tap Refresh SMS to check again.</p>}</div>
        </div>
      )}
      {message && <div className="panel"><p className="statusText">{message}</p></div>}
    </PageShell>
  );
}
