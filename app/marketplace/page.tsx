"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

const previewProducts = [
  ["🛡️", "9PROXY 10 IP", "$4.00"],
  ["👤", "Premium Account", "$7.50"],
  ["🌐", "Residential Proxy", "$8.00"],
] as const;

export default function Marketplace() {
  const [query, setQuery] = useState("");
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? previewProducts.filter(([, name]) => name.toLowerCase().includes(q)) : previewProducts;
  }, [query]);

  return (
    <PageShell title="Marketplace" subtitle="Premium accounts and digital products">
      <label className="marketplaceSearch" aria-label="Marketplace search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products"
          autoComplete="off"
        />
      </label>

      <div className="marketplaceSectionHeading"><h2>Featured</h2><span>Coming soon</span></div>
      {filteredProducts.length > 0 ? (
        <section className="marketplaceGrid" aria-live="polite">
          {filteredProducts.map(([icon, name, price]) => (
            <article className="marketplaceProduct" key={name}>
              <div className="marketplaceProductIcon" aria-hidden="true">{icon}</div>
              <div className="marketplaceProductCopy"><h3>{name}</h3><p>{price}</p></div>
              <button type="button" disabled aria-label={`Buying ${name} is not available yet`}>Buy</button>
            </article>
          ))}
        </section>
      ) : (
        <section className="marketplaceNotice" role="status">
          <div className="marketplaceNoticeIcon" aria-hidden="true">⌕</div>
          <h3>No products found</h3>
          <p>Try a different search term.</p>
          <button type="button" className="marketplaceHomeButton" onClick={() => setQuery("")}>Clear Search</button>
        </section>
      )}

      <section className="marketplaceNotice">
        <div className="marketplaceNoticeIcon" aria-hidden="true">🛍️</div>
        <h3>Marketplace purchasing is coming soon</h3>
        <p>The FADDED provider purchase contract has not been verified yet, so checkout remains disabled rather than guessing a provider endpoint.</p>
        <Link href="/" className="marketplaceHomeButton">Back Home</Link>
      </section>
    </PageShell>
  );
}
