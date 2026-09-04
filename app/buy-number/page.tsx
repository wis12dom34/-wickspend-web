"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";

const countryCodes: Record<string, string> = {
  Nigeria: "NG",
  USA: "US",
  UK: "GB",
  Germany: "DE",
  Canada: "CA",
  Poland: "PL",
};

const serviceCodes: Record<string, string> = {
  Telegram: "telegram",
  WhatsApp: "whatsapp",
  Instagram: "instagram",
  TikTok: "tiktok",
  Facebook: "facebook",
  Google: "google",
};

export default function BuyNumberPage() {
  const router = useRouter();
  const [country, setCountry] = useState("Nigeria");
  const [service, setService] = useState("Telegram");
  const [prices, setPrices] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [buying, setBuying] = useState(false);

  async function load(e: FormEvent) {
    e.preventDefault();
    setMessage("Checking live prices…");
    try {
      const data: any = await api.numbers.prices("", countryCodes[country] || country, serviceCodes[service] || service);
      const list = Array.isArray(data) ? data : (data?.prices || data?.items || data?.data || []);
      setPrices(Array.isArray(list) ? list : []);
      setMessage(Array.isArray(list) && list.length ? "" : "No numbers are available for this selection right now.");
    } catch (err) {
      setPrices([]);
      setMessage(err instanceof Error ? err.message : "Unable to load prices");
    }
  }

  async function buy() {
    if (buying) return;
    setBuying(true);
    setMessage("Purchasing number…");
    try {
      const token = localStorage.getItem("wickspend_session_token") || localStorage.getItem("wickspend_token") || "";
      if (!token) throw new Error("Please sign in first");
      const result: any = await api.numbers.buy(token, {
        country_code: countryCodes[country] || country,
        service_code: serviceCodes[service] || service,
      });
      const reference = result?.reference || result?.order?.reference || result?.data?.reference;
      setMessage("Number purchased successfully.");
      router.push(reference ? `/orders?reference=${encodeURIComponent(reference)}` : "/orders");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to purchase this number");
    } finally {
      setBuying(false);
    }
  }

  return (
    <PageShell title="Buy Number" subtitle="Choose a country and service">
      <form className="panel formGrid" onSubmit={load}>
        <div className="field">
          <label>Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option>Nigeria</option><option>USA</option><option>UK</option><option>Germany</option><option>Canada</option><option>Poland</option>
          </select>
        </div>
        <div className="field">
          <label>Service</label>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option>Telegram</option><option>WhatsApp</option><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>Google</option>
          </select>
        </div>
        <button className="secondaryButton" type="submit">View prices</button>
        {message && <p className="statusText">{message}</p>}
      </form>

      {prices.length > 0 && (
        <section>
          <div className="sectionTitle"><h2>Choose a number</h2></div>
          <div className="list">
            {prices.map((p: any, i) => (
              <div className="listItem" key={p.id || p.service_code || i}>
                <div>
                  <div className="price">₦{Number(p.price_ngn ?? p.final_price_ngn ?? p.price ?? 0).toLocaleString()}</div>
                  <small>{p.available ?? p.stock ?? "Available"}</small>
                </div>
                <button className="primaryButton" type="button" disabled={buying} onClick={buy} style={{ border: "1px solid #ddd" }}>
                  {buying ? "Buying…" : "Buy"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
