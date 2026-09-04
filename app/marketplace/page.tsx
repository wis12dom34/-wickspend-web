import Link from "next/link";
import { PageShell } from "@/components/PageShell";

const previewProducts = [
  ["🛡️", "9PROXY 10 IP", "$4.00"],
  ["👤", "Premium Account", "$7.50"],
  ["🌐", "Residential Proxy", "$8.00"],
] as const;

export default function Marketplace() {
  return (
    <PageShell title="Marketplace" subtitle="Premium accounts and digital products">
      <section className="marketplaceSearch" aria-label="Marketplace search">
        <span>⌕</span>
        <span>Search products</span>
      </section>

      <div className="marketplaceSectionHeading"><h2>Featured</h2><span>Coming soon</span></div>
      <section className="marketplaceGrid">
        {previewProducts.map(([icon, name, price]) => (
          <article className="marketplaceProduct" key={name}>
            <div className="marketplaceProductIcon">{icon}</div>
            <div className="marketplaceProductCopy"><h3>{name}</h3><p>{price}</p></div>
            <button type="button" disabled>Buy</button>
          </article>
        ))}
      </section>

      <section className="marketplaceNotice">
        <div className="marketplaceNoticeIcon">🛍️</div>
        <h3>Marketplace purchasing is coming soon</h3>
        <p>The FADDED provider purchase contract has not been verified yet, so checkout remains disabled rather than guessing a provider endpoint.</p>
        <Link href="/" className="marketplaceHomeButton">Back Home</Link>
      </section>
    </PageShell>
  );
}
