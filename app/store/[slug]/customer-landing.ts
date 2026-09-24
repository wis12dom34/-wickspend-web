export type MiniStoreLandingStore = {
  slug: string;
  store_name?: string | null;
  logo_url?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  rent_number_enabled?: boolean;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeImageUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export const MINI_STORE_LANDING_STYLES = `<style data-wick-store-landing-v1>
:root{--wick-blue:#0866f5;--wick-blue-pressed:#0757d9;--wick-blue-soft:#eef5ff;--wick-ink:#101318;--wick-title:#0f1728;--wick-copy:#596579;--wick-muted:#667085;--wick-border:#e3e8ef;--wick-border-strong:#dce4ef;--wick-surface:#f7faff;--wick-surface-2:#f8fafc}
html{scroll-behavior:smooth}
body{overflow-x:hidden}
body.wick-landing-active>.top,body.wick-landing-active>main.wrap{display:none!important}
body.wick-workspace-active>.top{display:none!important}
body.wick-workspace-active #wickLandingMain,body.wick-workspace-active #wickLandingBenefits,body.wick-workspace-active #wickLandingFooter{display:none!important}
body.wick-workspace-active>main.wrap{display:block!important;max-width:1080px;padding-top:26px;padding-bottom:42px}
#wickStorefront{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif;color:var(--wick-ink);background:#fff;width:100%;min-width:0}
#wickStorefront *{box-sizing:border-box}
#wickStorefront button,#wickStorefront input{font:inherit}
.wick-noticebar{height:32px;background:#0b1220;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 16px;font-size:12px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wick-header{background:#fff;border-bottom:1px solid rgba(15,23,42,.045);position:sticky;top:0;z-index:40}
.wick-header-inner{width:min(1240px,calc(100% - 48px));min-height:79px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:28px}
.wick-brand{display:flex;align-items:center;gap:11px;min-width:0;text-decoration:none;color:inherit}
.wick-logo{width:42px;height:42px;border-radius:13px;background:var(--wick-blue);color:#fff;display:grid;place-items:center;overflow:hidden;flex:0 0 42px;font-size:16px;font-weight:800}
.wick-logo img{width:100%;height:100%;object-fit:cover;display:block}
.wick-brand-copy{min-width:0;line-height:1}
.wick-brand-name{display:block;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--wick-ink);font-size:18px;line-height:21px;font-weight:750;letter-spacing:-.02em}
.wick-powered{display:block;margin-top:2px;color:#98a2b3;font-size:11px;line-height:13px;font-weight:400}
.wick-nav{display:flex;align-items:center;gap:28px;margin-left:auto}
.wick-nav button,.wick-nav a{appearance:none;border:0;background:transparent;padding:8px 0;color:#475467;text-decoration:none;font-size:14px;line-height:17px;font-weight:500;cursor:pointer;white-space:nowrap}
.wick-nav .active{color:var(--wick-blue);font-weight:650}
.wick-account{display:flex;align-items:center;gap:10px}
.wick-wallet-pill{appearance:none;border:0;background:var(--wick-blue-soft);color:var(--wick-blue);height:28px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:650;cursor:pointer;white-space:nowrap}
.wick-account-btn{appearance:none;height:43px;padding:0 20px;border-radius:12px;border:1px solid #d9e2ec;background:#fff;color:#1d2939;font-size:14px;font-weight:650;cursor:pointer;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wick-menu-btn{display:none;width:43px;height:43px;border:1px solid #d9e2ec;border-radius:12px;background:#fff;color:#1d2939;align-items:center;justify-content:center;cursor:pointer}
.wick-menu-btn span,.wick-menu-btn span:before,.wick-menu-btn span:after{display:block;width:17px;height:1.5px;background:currentColor;border-radius:999px;content:"";position:relative}
.wick-menu-btn span:before{position:absolute;top:-5px}.wick-menu-btn span:after{position:absolute;top:5px}
.wick-mobile-nav{display:none;border-top:1px solid #eef0f3;padding:8px 16px 14px;background:#fff}
.wick-mobile-nav.open{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wick-mobile-nav button{border:1px solid #e4e7ec;background:#fff;border-radius:12px;min-height:42px;color:#344054;font-size:13px;font-weight:650;text-align:left;padding:0 14px;cursor:pointer}
.wick-hero{background:var(--wick-surface);padding:68px 0}
.wick-container{width:min(1240px,calc(100% - 48px));margin:0 auto;min-width:0}
.wick-hero-grid{display:grid;grid-template-columns:minmax(0,590px) 510px;align-items:center;justify-content:space-between;gap:64px}
.wick-hero-copy{display:flex;flex-direction:column;align-items:flex-start;gap:18px;min-width:0}
.wick-eyebrow-pill{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;border-radius:999px;background:var(--wick-blue-soft);color:var(--wick-blue);font-size:12px;font-weight:650;white-space:nowrap}
.wick-hero h1{margin:0;color:var(--wick-title);font-size:54px;line-height:1.18;letter-spacing:-.045em;font-weight:780;max-width:590px}
.wick-hero-copy>p{margin:0;color:var(--wick-copy);font-size:17px;line-height:1.45;max-width:565px}
.wick-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wick-primary,.wick-secondary{appearance:none;min-height:43px;padding:0 20px;border-radius:12px;font-size:14px;font-weight:650;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
.wick-primary{background:var(--wick-blue);border:1px solid var(--wick-blue);color:#fff}.wick-primary:hover{background:var(--wick-blue-pressed);border-color:var(--wick-blue-pressed)}
.wick-secondary{background:#fff;border:1px solid #d9e2ec;color:#1d2939}
.wick-trust-labels{display:flex;gap:18px;flex-wrap:wrap;color:#667085;font-size:12px;font-weight:650}
.wick-quick{background:#fff;border:1px solid var(--wick-border-strong);border-radius:26px;padding:24px;min-width:0}
.wick-quick-head{display:flex;align-items:center;justify-content:space-between;gap:16px}
.wick-quick-head h2{margin:0;color:var(--wick-ink);font-size:20px;line-height:24px;letter-spacing:-.02em}.wick-quick-head p{margin:3px 0 0;color:#667085;font-size:13px;line-height:16px}
.wick-online{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;border-radius:999px;background:#ecfdf3;color:#027a48;font-size:12px;font-weight:650}
.wick-search-wrap{position:relative;margin-top:16px}
.wick-search{width:100%;height:43px;border:1px solid #e4e7ec;border-radius:12px;background:#f8fafc;color:#344054;padding:0 14px;outline:none;font-size:14px}.wick-search:focus{border-color:#b9cff7;box-shadow:0 0 0 3px rgba(8,102,245,.08)}.wick-search::placeholder{color:#98a2b3}
.wick-search-results{display:none;position:absolute;left:0;right:0;top:49px;z-index:20;background:#fff;border:1px solid #e4e7ec;border-radius:14px;box-shadow:0 18px 44px rgba(16,24,40,.12);padding:6px;max-height:280px;overflow:auto}.wick-search-results.open{display:block}
.wick-search-result{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;background:#fff;border-radius:10px;padding:10px 11px;text-align:left;cursor:pointer;color:#344054;font-size:13px}.wick-search-result:hover{background:#f8fafc}.wick-search-result small{color:#98a2b3}.wick-toast{position:fixed;left:50%;bottom:24px;z-index:90;transform:translate(-50%,18px);max-width:min(92vw,460px);padding:11px 14px;border-radius:12px;background:#eef5ff;color:#0757d9;font-size:13px;font-weight:650;box-shadow:0 16px 40px rgba(16,24,40,.16);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}.wick-toast.show{opacity:1;transform:translate(-50%,0)}.wick-toast.error{background:#fff1f0;color:#b42318}
.wick-quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}
.wick-service-card{appearance:none;width:100%;min-height:197px;background:#fff;border:1px solid var(--wick-border);border-radius:18px;padding:18px;text-align:left;display:flex;flex-direction:column;align-items:flex-start;gap:12px;cursor:pointer;color:inherit;min-width:0;transition:border-color .15s ease,transform .15s ease}.wick-service-card:hover{border-color:#cdd8e8;transform:translateY(-1px)}
.wick-icon-box{width:42px;height:42px;border-radius:13px;background:var(--wick-blue-soft);color:var(--wick-blue);display:grid;place-items:center;font-size:14px;font-weight:800;flex:0 0 42px}.wick-service-title{font-size:16px;line-height:19px;font-weight:650;color:var(--wick-ink)}.wick-service-desc{font-size:12px;line-height:17px;color:#667085;min-height:34px}.wick-service-tag{margin-top:auto;display:inline-flex;align-items:center;min-height:28px;padding:0 12px;border-radius:999px;background:#f5f7fa;color:#475467;font-size:12px;font-weight:650}
.wick-benefits{background:#fff;border-top:1px solid rgba(15,23,42,.025);border-bottom:1px solid rgba(15,23,42,.025);padding:24px 0}
.wick-benefits-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:48px;max-width:891px;margin:0 auto}.wick-benefit b{display:block;color:var(--wick-ink);font-size:14px;line-height:17px;font-weight:650}.wick-benefit span{display:block;margin-top:3px;color:#667085;font-size:11px;line-height:13px}
.wick-section{padding:74px 0}.wick-section.alt{background:var(--wick-surface-2);padding:72px 0 76px}.wick-section-head{max-width:760px;margin:0 auto 34px;text-align:center}.wick-kicker{margin:0;color:var(--wick-blue);font-size:11px;line-height:13px;font-weight:650;text-transform:uppercase}.wick-section-head h2{margin:9px 0 0;color:var(--wick-ink);font-size:32px;line-height:38px;letter-spacing:-.035em;font-weight:760}.wick-section-head p{margin:9px 0 0;color:#667085;font-size:14px;line-height:20px}
.wick-popular-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:20px}.wick-popular-grid .wick-service-card{min-height:197px}
.wick-category-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 20px}.wick-category{appearance:none;width:100%;min-height:80px;border:1px solid #e5eaf1;background:#fff;border-radius:18px;padding:18px;display:flex;align-items:center;gap:14px;text-align:left;cursor:pointer;min-width:0}.wick-category:hover{border-color:#cdd8e8}.wick-category-copy{min-width:0}.wick-category-copy b{display:block;color:var(--wick-ink);font-size:16px;line-height:19px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wick-category-copy span{display:block;margin-top:4px;color:#667085;font-size:12px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wick-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.wick-step{min-height:171px;border:1px solid #e4e7ec;border-radius:20px;background:#fff;padding:24px}.wick-step-num{display:inline-flex;min-height:28px;align-items:center;padding:0 12px;border-radius:999px;background:var(--wick-blue);color:#fff;font-size:12px;font-weight:650}.wick-step h3{margin:14px 0 0;color:var(--wick-ink);font-size:19px;line-height:23px;letter-spacing:-.02em}.wick-step p{margin:14px 0 0;color:#667085;font-size:14px;line-height:21px;max-width:350px}
.wick-cta-wrap{padding:36px 0 72px}.wick-cta{min-height:140px;border-radius:26px;background:var(--wick-blue);padding:40px 46px;display:flex;align-items:center;justify-content:space-between;gap:28px}.wick-cta h2{margin:0;color:#fff;font-size:29px;line-height:35px;letter-spacing:-.03em}.wick-cta p{margin:7px 0 0;color:#dceaff;font-size:15px;line-height:18px}.wick-cta .wick-secondary{flex:0 0 auto}
.wick-footer{background:#0b1018;color:#fff;padding:40px 0 28px}.wick-footer-top{display:flex;align-items:flex-start;justify-content:space-between;gap:32px}.wick-footer-brand b{font-size:17px;line-height:20px}.wick-footer-brand span{display:block;margin-top:5px;color:#98a2b3;font-size:12px;line-height:14px}.wick-footer-links{display:flex;align-items:center;gap:26px;flex-wrap:wrap;justify-content:flex-end}.wick-footer-links button{border:0;background:transparent;color:#d0d5dd;font-size:12px;line-height:14px;padding:0;cursor:pointer}.wick-footer-bottom{border-top:1px solid rgba(255,255,255,.05);margin-top:30px;padding-top:18px;display:flex;align-items:center;justify-content:space-between;gap:20px;color:#667085;font-size:11px}.wick-footer-bottom .powered{color:#98a2b3;font-weight:650}
.wick-workspace-back{appearance:none;min-height:40px;border-radius:12px;border:1px solid #d9e2ec;background:#fff;color:#1d2939;padding:0 14px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px}
body.wick-workspace-active>main.wrap .hero{margin-top:0}
@media(max-width:1180px){.wick-hero-grid{grid-template-columns:minmax(0,1fr) minmax(440px,510px);gap:40px}.wick-hero h1{font-size:48px}.wick-popular-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.wick-benefits-grid{max-width:none}.wick-nav{gap:20px}}
@media(max-width:960px){.wick-header-inner{gap:14px}.wick-nav{display:none}.wick-menu-btn{display:flex}.wick-hero-grid{grid-template-columns:1fr}.wick-hero-copy{max-width:650px}.wick-quick{width:100%;max-width:650px}.wick-benefits-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 40px}.wick-category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wick-steps{grid-template-columns:1fr}.wick-cta{align-items:flex-start;flex-direction:column}.wick-footer-top{flex-direction:column}.wick-footer-links{justify-content:flex-start}}
@media(max-width:700px){.wick-header-inner,.wick-container{width:min(100% - 32px,1240px)}.wick-header-inner{min-height:70px;gap:10px}.wick-brand-name{font-size:16px;max-width:150px}.wick-powered{font-size:10px}.wick-logo{width:38px;height:38px;flex-basis:38px;border-radius:12px}.wick-wallet-pill{display:none}.wick-account-btn{height:40px;padding:0 13px;max-width:92px;font-size:12px}.wick-menu-btn{width:40px;height:40px}.wick-hero{padding:48px 0}.wick-hero h1{font-size:42px;line-height:1.12}.wick-hero-copy>p{font-size:16px}.wick-quick{padding:20px;border-radius:22px}.wick-quick-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wick-service-card{min-height:184px;padding:16px}.wick-benefits{padding:22px 0}.wick-section,.wick-section.alt{padding:56px 0}.wick-section-head{margin-bottom:28px}.wick-section-head h2{font-size:28px;line-height:34px}.wick-popular-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wick-category-grid{grid-template-columns:1fr;gap:12px}.wick-cta-wrap{padding:20px 0 48px}.wick-cta{padding:30px 26px;border-radius:22px}.wick-cta h2{font-size:25px;line-height:31px}.wick-footer{padding-top:34px}.wick-footer-bottom{align-items:flex-start;flex-direction:column}.wick-trust-labels{gap:12px 16px}}
@media(max-width:520px){.wick-noticebar{font-size:10px}.wick-brand-name{max-width:118px}.wick-account{gap:7px}.wick-hero{padding:38px 0}.wick-hero h1{font-size:36px;line-height:1.1;letter-spacing:-.04em}.wick-hero-copy{gap:16px}.wick-actions{width:100%}.wick-actions .wick-primary,.wick-actions .wick-secondary{flex:1 1 0;padding:0 14px}.wick-quick{padding:18px}.wick-quick-head h2{font-size:18px}.wick-online{padding:0 10px}.wick-quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wick-service-card{min-height:174px;padding:14px;gap:10px}.wick-service-title{font-size:15px}.wick-popular-grid{grid-template-columns:1fr}.wick-popular-grid .wick-service-card{min-height:168px}.wick-benefits-grid{grid-template-columns:1fr 1fr;gap:20px}.wick-section-head h2{font-size:26px;line-height:31px}.wick-section-head p{font-size:13px}.wick-step{min-height:0}.wick-cta .wick-secondary{width:100%}.wick-footer-links{gap:18px}.wick-mobile-nav.open{grid-template-columns:1fr 1fr}}
@media(max-width:380px){.wick-header-inner,.wick-container{width:min(100% - 24px,1240px)}.wick-brand-name{max-width:100px}.wick-account-btn{max-width:76px;padding:0 10px}.wick-menu-btn{width:38px;height:38px}.wick-hero h1{font-size:33px}.wick-actions{display:grid;grid-template-columns:1fr;width:100%}.wick-actions .wick-primary,.wick-actions .wick-secondary{width:100%}.wick-quick-grid{grid-template-columns:1fr 1fr}.wick-service-card{min-height:166px;padding:13px}.wick-service-desc{font-size:11px}.wick-benefits-grid{grid-template-columns:1fr}.wick-mobile-nav.open{grid-template-columns:1fr}}
</style>`;

export function renderMiniStoreLanding(store: MiniStoreLandingStore) {
  const storeName = String(store.store_name || store.slug || "Store").trim() || "Store";
  const escapedName = escapeHtml(storeName);
  const initial = escapeHtml(storeName.charAt(0).toUpperCase() || "S");
  const logoUrl = safeImageUrl(store.logo_url);
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapedName} logo" loading="eager" decoding="async">`
    : initial;
  const rentEnabled = store.rent_number_enabled !== false;
  const year = new Date().getFullYear();

  const quickServices = [
    { key: "numbers", icon: "01", title: "Buy Number", desc: "Instant OTP numbers", tag: "Instant" },
    ...(rentEnabled ? [{ key: "rent", icon: "R", title: "Rent Number", desc: "Keep a number longer", tag: "Flexible" }] : []),
    { key: "boostly", icon: "B", title: "Boostly", desc: "Social media growth", tag: "Popular" },
    { key: "marketplace", icon: "M", title: "Marketplace", desc: "Premium digital goods", tag: "Browse" },
    { key: "wallet", icon: "W", title: "Wallet", desc: "Fund and manage balance", tag: "Secure" },
  ];

  const popularServices = [
    { key: "numbers", icon: "01", title: "Buy Number", desc: "Receive OTPs for supported platforms.", tag: "Shop now" },
    ...(rentEnabled ? [{ key: "rent", icon: "R", title: "Rent Number", desc: "Rent numbers for longer sessions and repeat use.", tag: "View rentals" }] : []),
    { key: "boostly", icon: "B", title: "Boostly", desc: "Order social media growth services in minutes.", tag: "Explore" },
    { key: "marketplace", icon: "M", title: "Marketplace", desc: "Shop premium accounts, logs and digital tools.", tag: "Browse" },
  ];

  const renderService = (item: (typeof quickServices)[number]) =>
    `<button type="button" class="wick-service-card" data-wick-service="${item.key}" data-search="${escapeHtml(`${item.title} ${item.desc}`.toLowerCase())}" onclick="wickOpenService('${item.key}')"><span class="wick-icon-box">${escapeHtml(item.icon)}</span><span class="wick-service-title">${escapeHtml(item.title)}</span><span class="wick-service-desc">${escapeHtml(item.desc)}</span><span class="wick-service-tag">${escapeHtml(item.tag)}</span></button>`;

  const supportPhone = String(store.support_phone || "").trim();
  const supportEmail = String(store.support_email || "").trim();
  const runtime = JSON.stringify({
    slug: store.slug,
    supportPhone,
    supportEmail,
    rentEnabled,
  }).replaceAll("<", "\\u003c");

  const html = `<div id="wickStorefront">
    <div id="wickLandingToast" class="wick-toast" role="status" aria-live="polite"></div>
    <div class="wick-noticebar">Instant digital services&nbsp; • &nbsp;Secure checkout&nbsp; • &nbsp;Fast delivery</div>
    <header class="wick-header">
      <div class="wick-header-inner">
        <button type="button" class="wick-brand" onclick="wickBackHome()" aria-label="${escapedName} home" style="border:0;background:transparent;padding:0;text-align:left;cursor:pointer">
          <span class="wick-logo">${logo}</span>
          <span class="wick-brand-copy"><span class="wick-brand-name">${escapedName}</span></span>
        </button>
        <nav class="wick-nav" aria-label="Store navigation">
          <button type="button" class="active" onclick="wickBackHome()">Home</button>
          <button type="button" onclick="wickGoServices()">Services</button>
          <button type="button" onclick="wickOpenOrders()">Orders</button>
          <button type="button" onclick="wickOpenSupport()">Support</button>
        </nav>
        <div class="wick-account">
          <button id="wickWalletBalance" type="button" class="wick-wallet-pill" onclick="wickOpenService('wallet')">Wallet</button>
          <button id="wickAccountLabel" type="button" class="wick-account-btn" onclick="account()">Sign in</button>
          <button id="wickMenuBtn" type="button" class="wick-menu-btn" aria-label="Open navigation" aria-expanded="false" onclick="wickToggleMenu()"><span></span></button>
        </div>
      </div>
      <div id="wickMobileNav" class="wick-mobile-nav" aria-label="Mobile store navigation">
        <button type="button" onclick="wickBackHome();wickCloseMenu()">Home</button><button type="button" onclick="wickGoServices();wickCloseMenu()">Services</button><button type="button" onclick="wickOpenOrders();wickCloseMenu()">Orders</button><button type="button" onclick="wickOpenService('wallet');wickCloseMenu()">Wallet</button><button type="button" onclick="wickOpenSupport();wickCloseMenu()">Support</button>
      </div>
    </header>
    <main id="wickLandingMain">
      <section class="wick-hero">
        <div class="wick-container wick-hero-grid">
          <div class="wick-hero-copy">
            <span class="wick-eyebrow-pill">Your trusted digital store</span>
            <h1>Everything digital.<br>One simple storefront.</h1>
            <p>Buy numbers, rent services, grow your social pages and shop premium digital products — all from one clean store.</p>
            <div class="wick-actions"><button type="button" class="wick-primary" onclick="wickGoServices()">Explore services</button><button type="button" class="wick-secondary" onclick="wickOpenOrders()">Track an order</button></div>
            <div class="wick-trust-labels"><span>✓ Instant delivery</span><span>✓ Secure checkout</span><span>✓ Human support</span></div>
          </div>
          <aside class="wick-quick" aria-label="Service discovery">
            <div class="wick-quick-head"><div><h2>What do you need today?</h2><p>Choose a service to get started</p></div><span class="wick-online">Online</span></div>
            <div class="wick-search-wrap"><input id="wickServiceSearch" class="wick-search" type="search" autocomplete="off" placeholder="Search services or products" aria-label="Search services or products"><div id="wickSearchResults" class="wick-search-results"></div></div>
            <div class="wick-quick-grid">${quickServices.map(renderService).join("")}</div>
          </aside>
        </div>
      </section>
      <section id="wickLandingBenefits" class="wick-benefits"><div class="wick-container"><div class="wick-benefits-grid"><div class="wick-benefit"><b>Fast fulfillment</b><span>Digital delivery without long waits</span></div><div class="wick-benefit"><b>Secure payments</b><span>Simple wallet and checkout flow</span></div><div class="wick-benefit"><b>Order visibility</b><span>Track active and completed orders</span></div><div class="wick-benefit"><b>Real support</b><span>Get help when you need it</span></div></div></div></section>
      <section id="wickPopularServices" class="wick-section"><div class="wick-container"><div class="wick-section-head"><p class="wick-kicker">Popular services</p><h2>Start with what customers buy most</h2><p>Quick access to the core services available inside this Mini Store.</p></div><div class="wick-popular-grid">${popularServices.map(renderService).join("")}</div></div></section>
      <section id="wickCategories" class="wick-section alt"><div class="wick-container"><div class="wick-section-head"><p class="wick-kicker">Browse the store</p><h2>Shop by category</h2><p>Find the right service without digging through menus.</p></div><div class="wick-category-grid">
        <button type="button" class="wick-category" data-requires="numbers" onclick="wickOpenService('numbers')"><span class="wick-icon-box">N</span><span class="wick-category-copy"><b>Phone Numbers</b><span>OTP and verification services</span></span></button>
        <button type="button" class="wick-category" data-requires="boostly" onclick="wickOpenService('boostly')"><span class="wick-icon-box">S</span><span class="wick-category-copy"><b>Social Growth</b><span>Followers, likes, views and more</span></span></button>
        <button type="button" class="wick-category" data-requires="marketplace" data-market-terms="facebook,instagram,tiktok,reddit,dating,account" onclick="wickOpenCategory('marketplace','account')"><span class="wick-icon-box">P</span><span class="wick-category-copy"><b>Premium Accounts</b><span>Ready-to-use digital accounts</span></span></button>
        <button type="button" class="wick-category" data-requires="marketplace" data-market-terms="vpn,proxy,vpn_proxy" onclick="wickOpenCategory('marketplace','vpn')"><span class="wick-icon-box">V</span><span class="wick-category-copy"><b>VPN &amp; Proxy</b><span>Privacy and connection tools</span></span></button>
        <button type="button" class="wick-category" data-requires="marketplace" data-market-terms="other,tool,discord" onclick="wickOpenCategory('marketplace','tool')"><span class="wick-icon-box">D</span><span class="wick-category-copy"><b>Digital Tools</b><span>Utilities for online work</span></span></button>
        <button type="button" class="wick-category" data-requires="marketplace" data-market-terms="email,mail" onclick="wickOpenCategory('marketplace','email')"><span class="wick-icon-box">E</span><span class="wick-category-copy"><b>Email Services</b><span>Email and account services</span></span></button>
      </div></div></section>
      <section class="wick-section"><div class="wick-container"><div class="wick-section-head"><p class="wick-kicker">Simple checkout</p><h2>Buy in three easy steps</h2><p>The customer journey stays fast from discovery to delivery.</p></div><div class="wick-steps"><article class="wick-step"><span class="wick-step-num">01</span><h3>Choose a service</h3><p>Browse categories or search for exactly what you need.</p></article><article class="wick-step"><span class="wick-step-num">02</span><h3>Pay securely</h3><p>Use your Mini Store wallet or an available checkout method.</p></article><article class="wick-step"><span class="wick-step-num">03</span><h3>Get your order</h3><p>Receive your digital product or track fulfillment from Orders.</p></article></div></div></section>
      <section class="wick-cta-wrap"><div class="wick-container"><div class="wick-cta"><div><h2>Ready to place your next order?</h2><p>Explore the store, pick a service and complete your order in minutes.</p></div><button type="button" class="wick-secondary" onclick="wickGoServices()">Browse all services</button></div></div></section>
    </main>
    <footer id="wickLandingFooter" class="wick-footer"><div class="wick-container"><div class="wick-footer-top"><div class="wick-footer-brand"><b>${escapedName}</b><span>Digital services powered by WickSpend.</span></div><div class="wick-footer-links"><button type="button" onclick="wickGoServices()">Services</button><button type="button" onclick="wickOpenOrders()">Orders</button><button type="button" onclick="wickOpenSupport()">Support</button></div></div><div class="wick-footer-bottom"><span>© ${year} ${escapedName}</span><span class="powered">Powered by WickSpend</span></div></div></footer>
  </div>`;

  const script = `<script data-wick-store-landing-script>(function(){
    var cfg=${runtime};
    var body=document.body,legacyMain=document.querySelector('body>main.wrap');
    body.classList.add('wick-landing-active');
    function byId(id){return document.getElementById(id)}
    function notify(message,error){var toast=byId('wickLandingToast');if(body.classList.contains('wick-landing-active')&&toast){toast.textContent=message;toast.className='wick-toast show'+(error?' error':'');if(window.__wickToastTimer)clearTimeout(window.__wickToastTimer);window.__wickToastTimer=setTimeout(function(){toast.classList.remove('show')},3600);return}if(typeof window.note==='function')return window.note(message,!!error)}
    function serviceExists(key){if(key==='numbers')return !!byId('serviceTabNumbers');if(key==='marketplace')return !!byId('serviceTabMarketplace');if(key==='boostly')return !!byId('serviceTabBoostly');if(key==='rent')return !!document.querySelector('a[data-wick-rent-number]');if(key==='wallet')return !!byId('fundAmount');return false}
    function closeSearch(){var box=byId('wickSearchResults');if(box){box.classList.remove('open');box.innerHTML=''}}
    function showWorkspace(){body.classList.remove('wick-landing-active');body.classList.add('wick-workspace-active');if(legacyMain&&!byId('wickWorkspaceBack')){var back=document.createElement('button');back.id='wickWorkspaceBack';back.className='wick-workspace-back';back.type='button';back.textContent='← Store home';back.onclick=window.wickBackHome;legacyMain.prepend(back)}}
    function scrollLegacy(target){setTimeout(function(){var n=typeof target==='string'?document.querySelector(target):target;if(n)n.scrollIntoView({behavior:'smooth',block:'start'})},40)}
    window.wickBackHome=function(){body.classList.remove('wick-workspace-active');body.classList.add('wick-landing-active');closeSearch();window.scrollTo({top:0,behavior:'smooth'})};
    window.wickGoServices=function(){if(body.classList.contains('wick-workspace-active')){window.wickBackHome();setTimeout(window.wickGoServices,120);return}var n=byId('wickPopularServices');if(n)n.scrollIntoView({behavior:'smooth',block:'start'})};
    window.wickOpenService=function(key){closeSearch();if(!serviceExists(key)){notify('This service is not available in this store right now.',true);return}if(key==='rent'){location.href='/store/'+encodeURIComponent(cfg.slug)+'/rent-number';return}showWorkspace();if(key==='wallet'){scrollLegacy('main.wrap .hero .card:nth-child(2)');return}if(typeof window.switchService==='function')window.switchService(key);scrollLegacy('#panel'+(key.charAt(0).toUpperCase()+key.slice(1)))};
    window.wickOpenOrders=function(){closeSearch();if(!window.token){if(typeof window.openAuth==='function')window.openAuth();return}showWorkspace();if(typeof window.loadCurrentOrders==='function')window.loadCurrentOrders();scrollLegacy('#orders')};
    window.wickOpenCategory=function(key,query){window.wickOpenService(key);setTimeout(function(){if(key==='marketplace'){var f=byId('marketSearch');if(f){f.value=query;if(typeof window.loadMarketplace==='function')window.loadMarketplace()}}else if(key==='boostly'){var b=byId('boostSearch');if(b){b.value=query;if(typeof window.loadBoostly==='function')window.loadBoostly()}}},90)};
    window.wickOpenSupport=function(){var hidden=byId('support'),dynamic=hidden&&String(hidden.textContent||'').trim(),phone=String(cfg.supportPhone||'').trim(),email=String(cfg.supportEmail||'').trim();if(phone){location.href='tel:'+phone.replace(/[^+0-9]/g,'');return}if(email){location.href='mailto:'+email;return}if(dynamic){if(dynamic.indexOf('@')>0)location.href='mailto:'+dynamic;else location.href='tel:'+dynamic.replace(/[^+0-9]/g,'');return}notify('Support contact is not configured for this store yet.',true)};
    window.wickToggleMenu=function(){var menu=byId('wickMobileNav'),btn=byId('wickMenuBtn');if(!menu||!btn)return;var open=!menu.classList.contains('open');menu.classList.toggle('open',open);btn.setAttribute('aria-expanded',open?'true':'false')};
    window.wickCloseMenu=function(){var menu=byId('wickMobileNav'),btn=byId('wickMenuBtn');if(menu)menu.classList.remove('open');if(btn)btn.setAttribute('aria-expanded','false')};
    function syncCustomer(){var sourceBalance=byId('balance'),sourceAccount=byId('accountBtn'),wallet=byId('wickWalletBalance'),accountLabel=byId('wickAccountLabel'),signedIn=!!window.token;if(wallet)wallet.textContent=signedIn&&sourceBalance?'Wallet '+String(sourceBalance.textContent||'₦0'):'Wallet';if(accountLabel)accountLabel.textContent=signedIn&&sourceAccount?String(sourceAccount.textContent||'Account'):'Sign in'}
    function pruneUnavailable(){document.querySelectorAll('#wickStorefront [data-wick-service]').forEach(function(node){var key=node.getAttribute('data-wick-service');node.hidden=!serviceExists(key)});document.querySelectorAll('#wickStorefront [data-requires]').forEach(function(node){node.hidden=!serviceExists(node.getAttribute('data-requires'))})}
    async function resolveMarketplaceCategories(){var nodes=[...document.querySelectorAll('#wickCategories [data-market-terms]')];if(!nodes.length||!serviceExists('marketplace')||typeof window.req!=='function')return;try{var x=await window.req('wickspend/store/catalog/marketplace?slug='+encodeURIComponent(cfg.slug)+'&page=1&limit=50'),products=x&&x.j&&Array.isArray(x.j.products)?x.j.products:[];if(!(x&&x.j&&x.j.ok)||!products.length)return;nodes.forEach(function(node){var terms=String(node.getAttribute('data-market-terms')||'').split(',').map(function(v){return v.trim().toLowerCase()}).filter(Boolean),available=products.some(function(product){var hay=[product&&product.category,product&&product.name,product&&product.title].filter(Boolean).join(' ').toLowerCase();return terms.some(function(term){return hay.indexOf(term)>=0})});node.hidden=!available})}catch(_error){}}
    function searchItems(query){var q=String(query||'').trim().toLowerCase(),results=[];document.querySelectorAll('#wickStorefront .wick-quick-grid [data-wick-service]:not([hidden])').forEach(function(node){var key=node.getAttribute('data-wick-service'),text=(node.getAttribute('data-search')||'')+' '+key;if(!q||text.indexOf(q)>=0){results.push({label:node.querySelector('.wick-service-title')?.textContent||key,sub:'Open service',action:function(){window.wickOpenService(key)}})}});if(q&&serviceExists('marketplace'))results.push({label:'Search Marketplace',sub:'Find products for “'+q+'”',action:function(){window.wickOpenCategory('marketplace',q)}});if(q&&serviceExists('boostly'))results.push({label:'Search Boostly',sub:'Find social services for “'+q+'”',action:function(){window.wickOpenCategory('boostly',q)}});return results.slice(0,8)}
    function renderSearch(){var input=byId('wickServiceSearch'),box=byId('wickSearchResults');if(!input||!box)return;var q=input.value,items=searchItems(q);if(!String(q||'').trim()){closeSearch();return}box.innerHTML='';if(!items.length){var empty=document.createElement('div');empty.className='wick-search-result';empty.textContent='No matching service';box.appendChild(empty)}else{items.forEach(function(item){var btn=document.createElement('button');btn.type='button';btn.className='wick-search-result';var label=document.createElement('span');label.textContent=item.label;var sub=document.createElement('small');sub.textContent=item.sub;btn.append(label,sub);btn.onclick=item.action;box.appendChild(btn)})}box.classList.add('open')}
    var input=byId('wickServiceSearch');if(input){input.addEventListener('input',renderSearch);input.addEventListener('keydown',function(e){if(e.key==='Escape')closeSearch();if(e.key==='Enter'){e.preventDefault();var items=searchItems(input.value);if(items[0])items[0].action()}})}
    document.addEventListener('click',function(e){var wrap=document.querySelector('.wick-search-wrap');if(wrap&&!wrap.contains(e.target))closeSearch()});
    var accountSource=byId('accountBtn'),balanceSource=byId('balance');if(accountSource)new MutationObserver(syncCustomer).observe(accountSource,{childList:true,characterData:true,subtree:true});if(balanceSource)new MutationObserver(syncCustomer).observe(balanceSource,{childList:true,characterData:true,subtree:true});
    pruneUnavailable();syncCustomer();setTimeout(function(){pruneUnavailable();syncCustomer()},250);setTimeout(syncCustomer,1200);
    var categorySection=byId('wickCategories');if(categorySection&&'IntersectionObserver' in window){var categoryObserver=new IntersectionObserver(function(entries){if(entries.some(function(entry){return entry.isIntersecting})){categoryObserver.disconnect();resolveMarketplaceCategories()}},{rootMargin:'500px 0px'});categoryObserver.observe(categorySection)}else{setTimeout(resolveMarketplaceCategories,1200)}
  })();</script>`;

  return { html, script };
}
