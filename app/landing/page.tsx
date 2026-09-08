import Link from "next/link";
import "./landing.css";

const services = [
  ["https://cdn.simpleicons.org/whatsapp/25D366", "WhatsApp"],
  ["https://cdn.simpleicons.org/telegram/26A5E4", "Telegram"],
  ["https://cdn.simpleicons.org/instagram/E4405F", "Instagram"],
  ["https://cdn.simpleicons.org/facebook/0866FF", "Facebook"],
  ["https://cdn.simpleicons.org/tiktok/000000", "TikTok"],
  ["https://cdn.simpleicons.org/x/000000", "X / Twitter"],
  ["https://cdn.simpleicons.org/google/4285F4", "Google"],
  ["https://cdn.simpleicons.org/discord/5865F2", "Discord"],
] as const;

const countries = [
  ["🇺🇸", "United States"],
  ["🇬🇧", "United Kingdom"],
  ["🇩🇪", "Germany"],
  ["🇳🇬", "Nigeria"],
  ["🇨🇦", "Canada"],
  ["🇵🇱", "Poland"],
  ["🇫🇷", "France"],
  ["🇳🇱", "Netherlands"],
] as const;

const faqs = [
  ["How quickly do numbers arrive?", "Available numbers are shown before purchase and are delivered immediately after a successful order."],
  ["What happens if no OTP arrives?", "Your active number screen shows the verification status, remaining time and the available refund or cancellation path for that order."],
  ["Can I rent a number for several days?", "Yes. WickSpend supports longer rental periods where the selected service and country offer them."],
  ["How are marketplace products delivered?", "Purchased digital products are delivered inside your WickSpend order flow so you can review them from the same account."],
  ["Can I manage everything from one wallet?", "Yes. Numbers, rentals and marketplace purchases all use the same WickSpend wallet and transaction history."],
] as const;

function NumberPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`glass preview ${compact ? "productPreview" : "previewHero floatPreview"}`}>
      <div className="previewHeader">WickSpend</div>
      <div className="previewTabs"><b>Numbers</b><span>Marketplace</span><span>Wallet</span></div>
      <div className="selectorRow">
        <div className="selector"><small>Country</small><strong>United States</strong></div>
        <div className="selector"><small>Service</small><strong>WhatsApp</strong></div>
      </div>
      <div className="numberCard">
        <div><strong>+1 (415) 526-XXXX</strong><div className="numberMeta">Available • 20 min validity</div></div>
        <Link className="miniBtn" href="/buy-number">Buy Number</Link>
      </div>
      {!compact && <div className="otpCard"><div><small>Waiting for OTP</small><strong>••••••</strong></div><b>24:57</b></div>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landingPage">
      <div className="landingWrap">
        <header className="landingNav fadeIn">
          <Link href="/landing" className="landingBrand">WickSpend</Link>
          <nav className="landingNavLinks" aria-label="Landing navigation">
            <a href="#products">Products</a><a href="#marketplace">Marketplace</a><a href="#wallet">Wallet</a><a href="#faq">Help</a>
            <Link href="/login">Sign in</Link>
          </nav>
          <button className="landingMenu" type="button" aria-label="Open menu">☰</button>
        </header>

        <section className="hero fadeIn">
          <h1>Digital services, without the friction.</h1>
          <p>Buy virtual numbers, receive OTPs, rent numbers, and access premium digital products from one clean WickSpend account.</p>
          <div className="ctaRow"><Link className="btn btnPrimary" href="/login">Get Started</Link><Link className="btn btnSecondary" href="/marketplace">Explore Marketplace</Link></div>
        </section>

        <NumberPreview />

        <section className="section" id="products">
          <div className="eyebrow">HOW IT WORKS</div>
          <h2>Three steps. Nothing more.</h2>
          <p className="sectionIntro">WickSpend keeps the buying flow short, clear, and consistent across numbers, OTP, rentals and marketplace products.</p>
          <div className="steps">
            {[['01','Choose','Pick country + service.'],['02','Purchase','Confirm transparent price.'],['03','Receive','Receive instantly.']].map(([n,t,d]) => <article className="glass step" key={n}><small>{n}</small><h3>{t}</h3><p>{d}</p></article>)}
          </div>
        </section>

        <section className="section productLayout">
          <div className="productCopy"><div className="eyebrow">PRODUCT</div><h2>Virtual Numbers</h2><p className="sectionIntro">Choose a country and service, then instantly see an available virtual number with validity and refund rules.</p></div>
          <NumberPreview compact />
        </section>

        <section className="section productLayout reverse">
          <div className="productCopy"><div className="eyebrow">PRODUCT</div><h2>Instant OTP</h2><p className="sectionIntro">Stay on one focused screen while WickSpend waits for your verification code and shows the timer, status and refund option.</p></div>
          <div className="glass preview productPreview"><div className="previewHeader">WickSpend</div><div className="otpCard"><div><small>Waiting for OTP</small><strong>••••••</strong></div><b>24:57</b></div><div className="numberCard"><div><strong>Verification active</strong><div className="numberMeta">WhatsApp • United States</div></div><Link href="/orders" className="miniBtn">View OTP</Link></div></div>
        </section>

        <section className="section productLayout">
          <div className="productCopy"><div className="eyebrow">PRODUCT</div><h2>Number Rentals</h2><p className="sectionIntro">Keep a number longer with clear rental periods, pricing and renewal context for repeat OTP use.</p></div>
          <NumberPreview compact />
        </section>

        <section className="section" id="marketplace">
          <div className="eyebrow">MARKETPLACE</div><h2>Premium digital products in the same account.</h2><p className="sectionIntro">Browse marketplace categories, search products, check live stock and purchase without leaving WickSpend.</p>
          <div className="glass preview productPreview"><div className="previewHeader">Marketplace</div><div className="selector" style={{height:46}}><small>Search products...</small></div><div className="marketList">{[['9PROXY 10 IP','$4.00 • 126 pcs'],['Premium Account','$7.50 • 18 pcs'],['Residential Proxy','$8.00 • 53 pcs']].map(([name,meta]) => <div className="marketItem" key={name}><div><b>{name}</b><small>{meta}</small></div><Link href="/marketplace" className="miniBtn">Buy</Link></div>)}</div></div>
        </section>

        <section className="section" id="wallet">
          <div className="eyebrow">WALLET</div><h2>One balance. Every purchase.</h2><p className="sectionIntro">Fund your wallet, track spending, view transactions and manage numbers and marketplace purchases from one dashboard.</p>
          <div className="glass preview productPreview"><div className="muted">Total Balance</div><div className="walletBalance">₦124,560</div><div className="ctaRow"><Link href="/add-funds" className="btn btnPrimary">Add Funds</Link><Link href="/wallet" className="btn btnSecondary">View Wallet</Link></div><div className="transactionList">{[['Number Rental','-₦800'],['Wallet Top Up','+₦50,000'],['Marketplace Purchase','-₦4,500']].map(([t,a]) => <div className="transaction" key={t}><span>{t}</span><span>{a}</span></div>)}</div></div>
        </section>

        <section className="section"><div className="eyebrow">POPULAR SERVICES</div><h2>Everything people ask for most.</h2><p className="sectionIntro">Quick access to the most-used verification and social platforms.</p><div className="chipGrid">{services.map(([icon,name]) => <Link className="glass chip" href={`/buy-number?service=${encodeURIComponent(name)}`} key={name}><img src={icon} alt=""/><span>{name}</span></Link>)}</div></section>

        <section className="section"><div className="eyebrow">POPULAR COUNTRIES</div><h2>Pick your market in one tap.</h2><p className="sectionIntro">Fast entry points for frequently requested countries.</p><div className="chipGrid">{countries.map(([flag,name]) => <Link className="glass chip" href={`/buy-number?country=${encodeURIComponent(name)}`} key={name}><span>{flag}</span><span>{name}</span></Link>)}</div></section>

        <section className="section"><div className="eyebrow">WHY WICKSPEND</div><h2>Built to remove unnecessary steps.</h2><p className="sectionIntro">The product focuses on speed, clear pricing, consistent workflows and unified order management.</p><div className="whyGrid">{[['Simple','Short flows.'],['Fast','Live availability.'],['Transparent','Clear pricing.'],['Unified','Orders in one place.']].map(([t,d]) => <article className="glass whyCard" key={t}><b>{t}</b><small>{d}</small></article>)}</div></section>

        <section className="section" id="faq"><div className="eyebrow">FAQ</div><h2>Questions, answered.</h2><p className="sectionIntro">Clear answers before you buy.</p><div className="faqList">{faqs.map(([q,a]) => <details className="faqItem" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>

        <section className="finalCta"><h2>Start with WickSpend today.</h2><p>Numbers, OTP, rentals and marketplace products—kept simple in one account.</p><Link href="/login" className="btn btnSecondary">Get Started</Link></section>

        <footer className="landingFooter"><div className="brandLine">WickSpend</div><div className="footerLinks"><a href="#products">Products</a><Link href="/buy-number">Numbers</Link><Link href="/marketplace">Marketplace</Link><a href="#faq">Help</a></div><div className="copyright">© 2026 WickSpend. All rights reserved.</div></footer>
      </div>
    </main>
  );
}
