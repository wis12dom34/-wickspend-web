"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

const previewProducts = [
  ["🛡️", "9PROXY 10 IP", "$4.00"],
  ["👤", "Premium Account", "$7.50"],
  ["🌐", "Residential Proxy", "$8.00"],
] as const;

export default function Marketplace() {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = useMemo(
    () => normalizedQuery ? previewProducts.filter(([, name]) => name.toLowerCase().includes(normalizedQuery)) : previewProducts,
    [normalizedQuery]
  );
  function clearSearch() {
    setQuery("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  return (
    <PageShell title="Marketplace" subtitle="Premium accounts and digital products">
      <label className="marketplaceSearch">
        <span aria-hidden="true">⌕</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products"
          aria-label="Search marketplace products"
          aria-controls="marketplace-results"
          autoComplete="off"
          enterKeyHint="search"
        />
        {query && <button type="button" onClick={clearSearch} aria-label="Clear marketplace search">×</button>}
      </label>

      <div className="marketplaceSectionHeading"><h2>Featured</h2><span>{normalizedQuery ? `${filteredProducts.length} found` : "Coming soon"}</span></div>
      {filteredProducts.length > 0 ? (
        <section id="marketplace-results" className="marketplaceGrid" aria-live="polite" aria-label="Marketplace products">
          {filteredProducts.map(([icon, name, price]) => (
            <article className="marketplaceProduct" key={name}>
              <div className="marketplaceProductIcon" aria-hidden="true">{icon}</div>
              <div className="marketplaceProductCopy"><h3>{name}</h3><p>{price}</p></div>
              <button type="button" disabled aria-label={`Buying ${name} is not available yet`}>Buy</button>
            </article>
          ))}
        </section>
      ) : (
        <section id="marketplace-results" className="marketplaceNotice" role="status">
          <div className="marketplaceNoticeIcon" aria-hidden="true">⌕</div>
          <h3>No products found</h3>
          <p>No preview products match “{query.trim()}”.</p>
          <button type="button" className="marketplaceHomeButton" onClick={clearSearch}>Clear Search</button>
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
