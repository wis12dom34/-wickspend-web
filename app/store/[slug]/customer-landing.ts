export type MiniStoreLandingTestimonial = {
  id?: string;
  name?: string;
  initials?: string;
  avatar_url?: string;
  rating?: number;
  review?: string;
  subtitle?: string;
  published?: boolean;
};

export type MiniStoreLandingConfig = {
  general?: {
    headline?: string;
    subheadline?: string;
    description?: string;
    primary_cta?: string;
    secondary_cta?: string;
    search_placeholder?: string;
  };
  services?: {
    heading?: string;
    subtitle?: string;
    items?: Record<string, { title?: string; description?: string; badge?: string }>;
  };
  ranking?: { enabled?: boolean; heading?: string; subtitle?: string; cta_text?: string };
  trust?: { heading?: string; subtitle?: string };
  testimonials?: {
    enabled?: boolean;
    heading?: string;
    subtitle?: string;
    items?: MiniStoreLandingTestimonial[];
  };
  footer?: { description?: string; copyright_text?: string };
};

export type MiniStoreLandingStore = {
  slug: string;
  store_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  rent_number_enabled?: boolean;
  landing_config?: MiniStoreLandingConfig | null;
};

const DEFAULT_TESTIMONIALS: MiniStoreLandingTestimonial[] = [
  { id: "sample-1", name: "Daniel O.", initials: "DO", avatar_url: "https://api.dicebear.com/9.x/personas/svg?seed=Daniel%20O", rating: 5, review: "Buying numbers here is fast and I normally receive my OTP without stress.", subtitle: "Customer", published: true },
  { id: "sample-2", name: "Chidera A.", initials: "CA", avatar_url: "https://api.dicebear.com/9.x/personas/svg?seed=Chidera%20A", rating: 5, review: "The process is straightforward and the dashboard is very easy to use.", subtitle: "Customer", published: true },
  { id: "sample-3", name: "Samuel K.", initials: "SK", avatar_url: "https://api.dicebear.com/9.x/personas/svg?seed=Samuel%20K", rating: 5, review: "I use the store regularly for numbers and digital services. Everything is simple.", subtitle: "Customer", published: true },
];

const DEFAULT_CONFIG = {
  general: {
    headline: "Everything you need, in one place",
    subheadline: "Your trusted digital store",
    description: "Get numbers, digital products and social growth services instantly from one clean storefront.",
    primary_cta: "Explore services",
    secondary_cta: "Track an order",
    search_placeholder: "Search services or products",
  },
  services: {
    heading: "Services",
    subtitle: "Choose what you need and get started in a few taps.",
    items: {
      numbers: { title: "Buy Number", description: "Instant OTP numbers", badge: "Instant" },
      rent: { title: "Rent Number", description: "Keep a number longer", badge: "Flexible" },
      boostly: { title: "Boostly", description: "Social media growth", badge: "Popular" },
      marketplace: { title: "Marketplace", description: "Premium digital goods", badge: "Browse" },
      wallet: { title: "Wallet", description: "Fund and manage balance", badge: "Secure" },
    },
  },
  ranking: { enabled: true, heading: "Top OTP Numbers", subtitle: "See the numbers performing best right now.", cta_text: "View all rankings →" },
  trust: { heading: "Why use this store", subtitle: "Simple, reliable access to the services you need." },
  testimonials: { enabled: true, heading: "What customers are saying", subtitle: "Trusted by customers using our services every day.", items: DEFAULT_TESTIMONIALS },
  footer: { description: "Digital services, made simple.", copyright_text: "© {year} {store}" },
} satisfies MiniStoreLandingConfig;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeText(value: unknown, fallback: string, max = 240) {
  const text = String(value ?? "").trim();
  return (text || fallback).slice(0, max);
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

function defaultAvatarUrl(name: string) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(name || "Customer")}`;
}

function safeColor(value: unknown) {
  const raw = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : "#0866F5";
}

function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const n = Number.parseInt(clean, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function iconSvg(name: string) {
  const start = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  const paths: Record<string, string> = {
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10 18.5h4"/><path d="M9 6.5h6"/>',
    rent: '<rect x="5" y="5" width="10" height="16" rx="2.2"/><path d="M8.5 17.5h3"/><circle cx="17" cy="8" r="4"/><path d="M17 6v2.3l1.5.9"/>',
    rocket: '<path d="M14 4c2.8-1.4 5-1 6-1-0 1 .4 3.2-1 6l-5.2 5.2-4-4L14 4Z"/><path d="M9.8 10.2 6 10l-3 3 5 1"/><path d="m13.8 14.2.2 3.8-3 3-1-5"/><circle cx="16.5" cy="6.5" r="1.5"/>',
    bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
    wallet: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H19v16H5.5A2.5 2.5 0 0 1 3 17.5v-11Z"/><path d="M3 8h16"/><path d="M14 12h6v4h-6a2 2 0 0 1 0-4Z"/>',
    bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
    shield: '<path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    activity: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
  };
  return start + (paths[name] || paths.activity) + "</svg>";
}

function normalizedConfig(raw: MiniStoreLandingConfig | null | undefined) {
  const provided = raw && typeof raw === "object" ? raw : {};
  const g = provided.general || {};
  const s = provided.services || {};
  const r = provided.ranking || {};
  const trust = provided.trust || {};
  const t = provided.testimonials || {};
  const f = provided.footer || {};
  const rawItems = s.items || {};
  const serviceItems: Record<string, { title: string; description: string; badge: string }> = {};
  const defaultServiceItems: Record<string, { title: string; description: string; badge: string }> = DEFAULT_CONFIG.services.items;
  for (const key of Object.keys(defaultServiceItems)) {
    const d = defaultServiceItems[key];
    const x = rawItems[key] || {};
    serviceItems[key] = {
      title: safeText(x.title, d.title, 50),
      description: safeText(x.description, d.description, 110),
      badge: safeText(x.badge, d.badge, 30),
    };
  }
  const hasTestimonialItems = Object.prototype.hasOwnProperty.call(t, "items");
  const testimonials = (hasTestimonialItems && Array.isArray(t.items) ? t.items : DEFAULT_TESTIMONIALS).slice(0, 12).map((item, index) => {
    const name = safeText(item?.name, "Customer", 80);
    return {
    id: safeText(item?.id, `review-${index + 1}`, 80),
    name,
    initials: safeText(item?.initials, String(item?.name || "Customer").split(/\s+/).map(v => v[0]).join("").slice(0, 2).toUpperCase() || "CU", 4),
    avatar_url: safeImageUrl(item?.avatar_url) || defaultAvatarUrl(name),
    rating: Math.min(5, Math.max(1, Math.round(Number(item?.rating || 5)))),
    review: safeText(item?.review, "", 300),
    subtitle: safeText(item?.subtitle, "", 100),
    published: item?.published !== false,
  };
  }).filter(item => item.review);
  return {
    general: {
      headline: safeText(g.headline, DEFAULT_CONFIG.general.headline, 100),
      subheadline: safeText(g.subheadline, DEFAULT_CONFIG.general.subheadline, 80),
      description: safeText(g.description, DEFAULT_CONFIG.general.description, 280),
      primary_cta: safeText(g.primary_cta, DEFAULT_CONFIG.general.primary_cta, 40),
      secondary_cta: safeText(g.secondary_cta, DEFAULT_CONFIG.general.secondary_cta, 40),
      search_placeholder: safeText(g.search_placeholder, DEFAULT_CONFIG.general.search_placeholder, 80),
    },
    services: { heading: safeText(s.heading, DEFAULT_CONFIG.services.heading, 80), subtitle: safeText(s.subtitle, DEFAULT_CONFIG.services.subtitle, 180), items: serviceItems },
    ranking: { enabled: r.enabled !== false, heading: safeText(r.heading, DEFAULT_CONFIG.ranking.heading, 80), subtitle: safeText(r.subtitle, DEFAULT_CONFIG.ranking.subtitle, 180), cta_text: safeText(r.cta_text, DEFAULT_CONFIG.ranking.cta_text, 50) },
    trust: { heading: safeText(trust.heading, DEFAULT_CONFIG.trust.heading, 80), subtitle: safeText(trust.subtitle, DEFAULT_CONFIG.trust.subtitle, 180) },
    testimonials: { enabled: t.enabled !== false, heading: safeText(t.heading, DEFAULT_CONFIG.testimonials.heading, 80), subtitle: safeText(t.subtitle, DEFAULT_CONFIG.testimonials.subtitle, 180), items: testimonials },
    footer: { description: safeText(f.description, DEFAULT_CONFIG.footer.description, 180), copyright_text: safeText(f.copyright_text, DEFAULT_CONFIG.footer.copyright_text, 100) },
  };
}

export const MINI_STORE_LANDING_STYLES = `<style data-wick-store-landing-v2>
:root{--wick-blue:#0866f5;--wick-blue-soft:#eef5ff;--wick-blue-ring:rgba(8,102,245,.16);--wick-ink:#101318;--wick-title:#0f1728;--wick-copy:#596579;--wick-muted:#667085;--wick-border:#e4e8ef;--wick-surface:#f7f9fc}
html{scroll-behavior:smooth}body{overflow-x:hidden}body.wick-landing-active>.top,body.wick-landing-active>main.wrap{display:none!important}body.wick-workspace-active #wickStorefront{display:none!important}body.wick-workspace-active>.top{display:none!important}body.wick-workspace-active>main.wrap{display:block!important;max-width:1080px;padding-top:26px;padding-bottom:42px}
#wickStorefront{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif;color:var(--wick-ink);background:#fff;width:100%;min-width:0}#wickStorefront *{box-sizing:border-box}#wickStorefront button,#wickStorefront input{font:inherit}#wickStorefront button{line-height:1.1}#wickStorefront svg{display:block;width:24px;height:24px}
.wick-header{background:rgba(255,255,255,.96);border-bottom:1px solid rgba(15,23,42,.06);position:sticky;top:0;z-index:40;backdrop-filter:blur(14px)}.wick-header-inner{width:min(1180px,calc(100% - 40px));min-height:82px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px}.wick-brand{display:flex;align-items:center;gap:14px;min-width:0;max-width:min(520px,60vw);flex:1 1 auto;overflow:hidden;text-decoration:none;color:inherit}.wick-logo{width:52px;height:52px;border-radius:14px;background:var(--wick-blue);color:#fff;display:grid;place-items:center;overflow:hidden;flex:0 0 52px;font-size:16px;font-weight:800}.wick-logo.has-image{width:170px;height:64px;max-width:180px;min-width:64px;border-radius:0;background:transparent;overflow:visible;flex:0 1 170px}.wick-logo img{width:100%;height:100%;object-fit:contain;object-position:center;display:block}.wick-brand-name{display:block;max-width:220px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17px;font-weight:760;letter-spacing:-.02em}.wick-nav{display:flex;align-items:center;gap:26px;margin-left:auto}.wick-nav button{appearance:none;border:0;background:transparent;padding:9px 0;color:#475467;font-size:13px;font-weight:560;cursor:pointer}.wick-nav .active{color:var(--wick-blue);font-weight:700}.wick-account{display:flex;align-items:center;gap:9px}.wick-wallet-pill{border:0;background:var(--wick-blue-soft);color:var(--wick-blue);height:42px;min-height:42px;padding:0 14px;border-radius:12px;font-size:11px;font-weight:720;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.wick-account-btn{height:42px;min-height:42px;padding:0 18px;border-radius:12px;border:1px solid #dfe4eb;background:#fff;color:#1d2939;font-size:13px;font-weight:680;cursor:pointer;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wick-menu-btn{display:none;width:42px;height:42px;min-height:42px;border:1px solid #dfe4eb;border-radius:12px;background:#fff;color:#1d2939;align-items:center;justify-content:center;cursor:pointer}.wick-menu-btn span,.wick-menu-btn span:before,.wick-menu-btn span:after{display:block;width:17px;height:1.5px;background:currentColor;border-radius:999px;content:"";position:relative}.wick-menu-btn span:before{position:absolute;top:-5px}.wick-menu-btn span:after{position:absolute;top:5px}.wick-mobile-nav{display:none;border-top:1px solid #eef0f3;padding:8px 16px 14px;background:#fff}.wick-mobile-nav.open{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wick-mobile-nav button{border:1px solid #e4e7ec;background:#fff;border-radius:12px;min-height:44px;color:#344054;font-size:13px;font-weight:650;text-align:left;padding:0 14px;cursor:pointer}
.wick-container{width:min(1180px,calc(100% - 40px));margin:0 auto;min-width:0}.wick-hero{background:linear-gradient(180deg,var(--wick-surface),#fff);padding:56px 0 46px}.wick-hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,520px);align-items:center;gap:54px}.wick-hero-copy{display:flex;flex-direction:column;align-items:flex-start;gap:17px;min-width:0}.wick-eyebrow-pill{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;border-radius:999px;background:var(--wick-blue-soft);color:var(--wick-blue);font-size:11px;font-weight:720}.wick-hero h1{margin:0;color:var(--wick-title);font-size:50px;line-height:1.08;letter-spacing:-.046em;font-weight:790;max-width:610px}.wick-hero-copy>p{margin:0;color:var(--wick-copy);font-size:16px;line-height:1.55;max-width:580px}.wick-actions{display:flex;align-items:stretch;gap:10px;flex-wrap:wrap}.wick-primary,.wick-secondary{appearance:none;height:44px;min-height:44px;padding:0 19px;border-radius:13px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}.wick-actions .wick-primary,.wick-actions .wick-secondary{min-width:154px}.wick-primary{background:var(--wick-blue);border:1px solid var(--wick-blue);color:#fff}.wick-secondary{background:#fff;border:1px solid #dfe4eb;color:#1d2939}.wick-primary:active,.wick-secondary:active{transform:scale(.98)}.wick-trust-labels{display:flex;gap:12px 18px;flex-wrap:wrap;color:#667085;font-size:11px;font-weight:650}.wick-trust-labels span:before{content:"✓";color:var(--wick-blue);margin-right:5px}.wick-quick{background:#fff;border:1px solid var(--wick-border);border-radius:24px;padding:22px;min-width:0;box-shadow:0 12px 34px rgba(16,24,40,.045)}.wick-quick-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.wick-quick-head h2{margin:0;font-size:21px;line-height:25px;letter-spacing:-.025em}.wick-quick-head p{margin:4px 0 0;color:#667085;font-size:12px;line-height:17px}.wick-online{display:inline-flex;align-items:center;gap:6px;min-height:27px;padding:0 10px;border-radius:999px;background:#ecfdf3;color:#067647;font-size:10px;font-weight:720}.wick-online:before{content:"";width:6px;height:6px;border-radius:50%;background:#17b26a}.wick-search-wrap{position:relative;margin-top:15px}.wick-search-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#98a2b3;pointer-events:none}.wick-search-icon svg{width:18px!important;height:18px!important}.wick-search{width:100%;height:44px;border:1px solid #e4e7ec;border-radius:13px;background:#fafbfc;color:#344054;padding:0 14px 0 40px;outline:none;font-size:13px}.wick-search:focus{border-color:var(--wick-blue);box-shadow:0 0 0 3px var(--wick-blue-ring)}.wick-search::placeholder{color:#98a2b3}.wick-search-results{display:none;position:absolute;left:0;right:0;top:50px;z-index:20;background:#fff;border:1px solid #e4e7ec;border-radius:14px;box-shadow:0 18px 44px rgba(16,24,40,.12);padding:6px;max-height:280px;overflow:auto}.wick-search-results.open{display:block}.wick-search-result{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;background:#fff;border-radius:10px;padding:11px;text-align:left;cursor:pointer;color:#344054;font-size:13px}.wick-search-result:hover{background:#f8fafc}.wick-search-result small{color:#98a2b3}.wick-quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px;align-items:stretch}.wick-service-card{appearance:none;width:100%;height:100%;min-height:154px;background:#fff;border:1px solid var(--wick-border);border-radius:18px;padding:15px;text-align:left;display:flex;flex-direction:column;align-items:flex-start;gap:9px;cursor:pointer;color:inherit;min-width:0;transition:border-color .15s ease,transform .15s ease}.wick-service-card:hover{border-color:var(--wick-blue);transform:translateY(-1px)}.wick-icon-box{width:42px;height:42px;border-radius:13px;background:var(--wick-blue-soft);color:var(--wick-blue);display:grid;place-items:center;flex:0 0 42px}.wick-icon-box svg{width:23px!important;height:23px!important}.wick-service-title{font-size:14px;line-height:18px;font-weight:720}.wick-service-desc{font-size:11px;line-height:15px;color:#667085;min-height:30px}.wick-service-tag{margin-top:auto;display:inline-flex;align-items:center;min-height:25px;padding:0 9px;border-radius:999px;background:#f4f6f8;color:#475467;font-size:10px;font-weight:700}
.wick-section{padding:64px 0}.wick-section.alt{background:#f8fafc}.wick-section-head{max-width:720px;margin:0 auto 28px;text-align:center}.wick-kicker{margin:0;color:var(--wick-blue);font-size:10px;line-height:13px;font-weight:760;text-transform:uppercase;letter-spacing:.09em}.wick-section-head h2{margin:8px 0 0;font-size:30px;line-height:36px;letter-spacing:-.035em}.wick-section-head p{margin:8px 0 0;color:#667085;font-size:13px;line-height:20px}.wick-ranking-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.wick-ranking-card{border:1px solid var(--wick-border);border-radius:20px;background:#fff;padding:17px;display:grid;grid-template-rows:auto auto minmax(40px,1fr) auto;gap:12px;min-width:0;height:100%}.wick-rank-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.wick-rank-badge{display:inline-flex;min-height:27px;align-items:center;padding:0 10px;border-radius:999px;background:#f2f4f7;color:#475467;font-size:10px;font-weight:800}.wick-rank-badge.gold{background:#fff4d6;color:#8a5b00}.wick-rank-badge.silver{background:#f1f3f5;color:#5d6673}.wick-rank-badge.bronze{background:#fff0e7;color:#92502a}.wick-live-pill{display:inline-flex;align-items:center;gap:6px;color:#067647;font-size:10px;font-weight:700}.wick-live-pill:before{content:"";width:6px;height:6px;border-radius:50%;background:#17b26a}.wick-rank-country{display:flex;align-items:center;gap:9px;min-width:0}.wick-rank-flag{font-size:24px}.wick-rank-country div{min-width:0}.wick-rank-country strong{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wick-rank-country span{display:block;margin-top:3px;color:var(--wick-blue);font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wick-rank-metrics{display:flex;flex-wrap:wrap;gap:7px}.wick-rank-metrics span{display:inline-flex;align-items:center;min-height:27px;padding:0 9px;border-radius:9px;background:#f7f8fa;color:#536071;font-size:10px}.wick-rank-metrics strong{color:#111;margin-right:3px}.wick-ranking-card button{width:100%;height:44px;min-height:44px;border:1px solid var(--wick-blue);border-radius:12px;background:#fff;color:var(--wick-blue);font-size:12px;font-weight:760;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.wick-ranking-skeleton{height:190px;border-radius:20px;border:1px solid var(--wick-border);background:linear-gradient(90deg,#f6f7f9,#fff,#f6f7f9);background-size:220% 100%;animation:wickPulse 1.25s linear infinite}.wick-ranking-state{grid-column:1/-1;border:1px solid var(--wick-border);border-radius:18px;padding:20px;text-align:center;color:#667085;font-size:12px}.wick-ranking-link{display:flex;justify-content:center;margin-top:18px}.wick-link-button{border:0;background:transparent;color:var(--wick-blue);font-size:12px;font-weight:760;cursor:pointer;height:44px;min-height:44px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center}
.wick-trust-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.wick-trust-card{border:1px solid var(--wick-border);border-radius:18px;background:#fff;padding:17px;display:flex;align-items:flex-start;gap:12px}.wick-trust-icon{width:38px;height:38px;flex:0 0 38px;border-radius:12px;background:var(--wick-blue-soft);color:var(--wick-blue);display:grid;place-items:center}.wick-trust-icon svg{width:21px!important;height:21px!important}.wick-trust-card b{display:block;font-size:13px}.wick-trust-card span{display:block;margin-top:4px;color:#667085;font-size:10px;line-height:15px}
.wick-testimonials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:stretch}.wick-testimonial{border:1px solid var(--wick-border);border-radius:20px;background:#fff;padding:18px;min-height:205px;height:100%;display:flex;flex-direction:column}.wick-stars{color:#f5a524;font-size:13px;letter-spacing:1px}.wick-testimonial blockquote{margin:14px 0 18px;color:#344054;font-size:13px;line-height:1.58}.wick-reviewer{display:flex;align-items:center;gap:10px;margin-top:auto}.wick-avatar{position:relative;width:44px;height:44px;flex:0 0 44px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:var(--wick-blue-soft);color:var(--wick-blue);font-size:11px;font-weight:800;border:1px solid var(--wick-border)}.wick-avatar-fallback{display:grid;place-items:center;width:100%;height:100%}.wick-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;background:#f4f6f8}.wick-reviewer b{display:block;font-size:12px}.wick-reviewer span{display:block;margin-top:2px;color:#98a2b3;font-size:10px}
.wick-cta-wrap{padding:10px 0 64px}.wick-cta{border-radius:24px;background:var(--wick-blue);padding:34px 40px;display:flex;align-items:center;justify-content:space-between;gap:24px}.wick-cta h2{margin:0;color:#fff;font-size:25px;letter-spacing:-.03em}.wick-cta p{margin:7px 0 0;color:rgba(255,255,255,.78);font-size:13px}.wick-cta .wick-secondary{flex:none;min-width:154px}.wick-footer{background:#0b1018;color:#fff;padding:36px 0 24px}.wick-footer-top{display:flex;align-items:flex-start;justify-content:space-between;gap:28px}.wick-footer-brand b{font-size:16px}.wick-footer-brand span{display:block;margin-top:6px;color:#98a2b3;font-size:11px;max-width:300px;line-height:16px}.wick-footer-links{display:flex;gap:22px;flex-wrap:wrap}.wick-footer-links button{border:0;background:transparent;color:#d0d5dd;font-size:11px;padding:0;cursor:pointer}.wick-footer-bottom{border-top:1px solid rgba(255,255,255,.06);margin-top:26px;padding-top:16px;color:#667085;font-size:10px}.wick-toast{position:fixed;left:50%;bottom:24px;z-index:90;transform:translate(-50%,18px);max-width:min(92vw,460px);padding:11px 14px;border-radius:12px;background:var(--wick-blue-soft);color:var(--wick-blue);font-size:12px;font-weight:680;box-shadow:0 16px 40px rgba(16,24,40,.16);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}.wick-toast.show{opacity:1;transform:translate(-50%,0)}.wick-toast.error{background:#fff1f0;color:#b42318}.wick-workspace-back{appearance:none;min-height:44px;border-radius:12px;border:1px solid #d9e2ec;background:#fff;color:#1d2939;padding:0 14px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px}@keyframes wickPulse{to{background-position:-220% 0}}
@media(max-width:960px){.wick-nav{display:none}.wick-menu-btn{display:flex}.wick-hero-grid{grid-template-columns:1fr}.wick-hero-copy{max-width:680px}.wick-quick{max-width:680px}.wick-ranking-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wick-trust-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wick-testimonials{grid-template-columns:repeat(2,minmax(0,1fr))}.wick-cta{align-items:flex-start;flex-direction:column}.wick-footer-top{flex-direction:column}}
@media(max-width:700px){.wick-header-inner,.wick-container{width:min(100% - 32px,1180px)}.wick-header-inner{min-height:72px;gap:8px}.wick-brand{gap:12px;max-width:none;flex:1 1 auto}.wick-logo{width:52px;height:52px;flex-basis:52px}.wick-logo.has-image{width:min(34vw,140px);height:56px;max-width:140px;min-width:72px;flex:0 1 140px}.wick-brand-name{font-size:15px;max-width:110px}.wick-wallet-pill{display:none}.wick-account-btn{height:44px;min-height:44px;padding:0 13px;max-width:92px;font-size:12px}.wick-menu-btn{width:44px;height:44px;min-height:44px}.wick-hero{padding:38px 0}.wick-hero h1{font-size:38px;line-height:1.08}.wick-hero-copy>p{font-size:15px}.wick-quick{padding:18px;border-radius:21px}.wick-quick-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.wick-service-card{min-height:150px;padding:14px}.wick-section{padding:40px 0}.wick-section-head{margin-bottom:23px}.wick-section-head h2{font-size:26px;line-height:32px}#wickTrust{padding-bottom:12px}#wickTestimonials{padding-top:12px}#wickTestimonials .wick-section-head{margin-bottom:18px}.wick-ranking-grid{grid-template-columns:1fr}.wick-trust-grid{grid-template-columns:1fr 1fr}.wick-testimonials{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;padding:0 1px 8px;scrollbar-width:none}.wick-testimonials::-webkit-scrollbar{display:none}.wick-testimonial{flex:0 0 min(84vw,330px);scroll-snap-align:start}.wick-cta-wrap{padding-bottom:48px}.wick-cta{padding:28px 24px}.wick-cta .wick-secondary{width:100%}.wick-footer{padding-top:32px}}
@media(max-width:440px){.wick-header-inner,.wick-container{width:min(100% - 28px,1180px)}.wick-header-inner{gap:7px}.wick-brand{gap:10px}.wick-logo.has-image{width:min(32vw,118px);height:54px;max-width:118px;min-width:64px;flex-basis:118px}.wick-brand-name{font-size:14px;max-width:76px}.wick-account{gap:6px}.wick-hero h1{font-size:34px}.wick-actions{width:100%}.wick-actions .wick-primary,.wick-actions .wick-secondary{flex:1 1 0;padding:0 12px}.wick-quick-head h2{font-size:18px}.wick-quick-grid{grid-template-columns:1fr 1fr}.wick-service-card{min-height:146px;padding:13px}.wick-service-title{font-size:13px}.wick-service-desc{font-size:10px}.wick-trust-grid{grid-template-columns:1fr}.wick-mobile-nav.open{grid-template-columns:1fr 1fr}}
@media(max-width:360px){.wick-header-inner,.wick-container{width:min(100% - 24px,1180px)}.wick-brand{gap:8px}.wick-logo.has-image{width:min(29vw,96px);height:52px;max-width:96px;min-width:60px;flex-basis:96px}.wick-brand-name{font-size:13px;max-width:48px}.wick-account-btn{max-width:76px;padding:0 10px}.wick-menu-btn{width:44px;height:44px;min-height:44px}.wick-hero h1{font-size:31px}.wick-actions{display:grid;grid-template-columns:1fr}.wick-actions .wick-primary,.wick-actions .wick-secondary{width:100%}.wick-service-card{min-height:142px;padding:12px}.wick-service-desc{min-height:28px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.wick-service-card,.wick-primary,.wick-secondary{transition:none}.wick-ranking-skeleton{animation:none}}
</style>`;

export function renderMiniStoreLanding(store: MiniStoreLandingStore) {
  const storeName = String(store.store_name || store.slug || "Store").trim() || "Store";
  const escapedName = escapeHtml(storeName);
  const initial = escapeHtml(storeName.charAt(0).toUpperCase() || "S");
  const logoUrl = safeImageUrl(store.logo_url);
  const logoClass = logoUrl ? "wick-logo has-image" : "wick-logo";
  const logo = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapedName} logo" loading="eager" decoding="async" onerror="var p=this.parentElement;p.classList.remove('has-image');p.textContent=(this.alt||'S').charAt(0)||'S'">` : initial;
  const rentEnabled = store.rent_number_enabled !== false;
  const primary = safeColor(store.primary_color);
  const config = normalizedConfig(store.landing_config);
  const year = new Date().getFullYear();
  const serviceDefaults = config.services.items;

  const quickServices = [
    { key: "numbers", icon: "phone", ...serviceDefaults.numbers },
    ...(rentEnabled ? [{ key: "rent", icon: "rent", ...serviceDefaults.rent }] : []),
    { key: "boostly", icon: "rocket", ...serviceDefaults.boostly },
    { key: "marketplace", icon: "bag", ...serviceDefaults.marketplace },
    { key: "wallet", icon: "wallet", ...serviceDefaults.wallet },
  ];

  const renderService = (item: (typeof quickServices)[number]) =>
    `<button type="button" class="wick-service-card" data-wick-service="${item.key}" data-search="${escapeHtml(`${item.title} ${item.description}`.toLowerCase())}" onclick="wickOpenService('${item.key}')"><span class="wick-icon-box">${iconSvg(item.icon)}</span><span class="wick-service-title">${escapeHtml(item.title)}</span><span class="wick-service-desc">${escapeHtml(item.description)}</span><span class="wick-service-tag">${escapeHtml(item.badge)}</span></button>`;

  const publishedTestimonials = config.testimonials.enabled ? config.testimonials.items.filter(item => item.published !== false) : [];
  const testimonialsHtml = publishedTestimonials.length ? `<section class="wick-section alt" id="wickTestimonials"><div class="wick-container"><div class="wick-section-head"><p class="wick-kicker">Testimonials</p><h2>${escapeHtml(config.testimonials.heading)}</h2><p>${escapeHtml(config.testimonials.subtitle)}</p></div><div class="wick-testimonials">${publishedTestimonials.map(item => `<article class="wick-testimonial"><div class="wick-stars" aria-label="${item.rating} out of 5 stars">${"★".repeat(item.rating)}${"☆".repeat(5-item.rating)}</div><blockquote>“${escapeHtml(item.review)}”</blockquote><div class="wick-reviewer"><span class="wick-avatar"><span class="wick-avatar-fallback">${escapeHtml(item.initials)}</span>${item.avatar_url ? `<img src="${escapeHtml(item.avatar_url)}" alt="${escapeHtml(item.name)} profile picture" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span><div><b>${escapeHtml(item.name)}</b>${item.subtitle ? `<span>${escapeHtml(item.subtitle)}</span>` : ""}</div></div></article>`).join("")}</div></div></section>` : "";

  const footerCopyright = config.footer.copyright_text.replaceAll("{year}", String(year)).replaceAll("{store}", storeName);
  const supportPhone = String(store.support_phone || "").trim();
  const supportEmail = String(store.support_email || "").trim();
  const runtime = JSON.stringify({ slug: store.slug, supportPhone, supportEmail, rentEnabled, rankingEnabled: config.ranking.enabled }).replaceAll("<", "\\u003c");

  const html = `<div id="wickStorefront" style="--wick-blue:${primary};--wick-blue-soft:${rgba(primary,.085)};--wick-blue-ring:${rgba(primary,.16)}">
    <div id="wickLandingToast" class="wick-toast" role="status" aria-live="polite"></div>
    <header class="wick-header"><div class="wick-header-inner">
      <button type="button" class="wick-brand" onclick="wickBackHome()" aria-label="${escapedName} home" style="border:0;background:transparent;padding:0;text-align:left;cursor:pointer"><span class="${logoClass}">${logo}</span><span class="wick-brand-name">${escapedName}</span></button>
      <nav class="wick-nav" aria-label="Store navigation"><button type="button" class="active" onclick="wickBackHome()">Home</button><button type="button" onclick="wickGoServices()">Services</button><button type="button" onclick="wickOpenOrders()">Orders</button><button type="button" onclick="wickOpenSupport()">Support</button></nav>
      <div class="wick-account"><button id="wickWalletBalance" type="button" class="wick-wallet-pill" onclick="wickOpenService('wallet')">Wallet</button><button id="wickAccountLabel" type="button" class="wick-account-btn" onclick="account()">Sign in</button><button id="wickMenuBtn" type="button" class="wick-menu-btn" aria-label="Open navigation" aria-expanded="false" onclick="wickToggleMenu()"><span></span></button></div>
    </div><div id="wickMobileNav" class="wick-mobile-nav"><button type="button" onclick="wickBackHome();wickCloseMenu()">Home</button><button type="button" onclick="wickGoServices();wickCloseMenu()">Services</button><button type="button" onclick="wickOpenOrders();wickCloseMenu()">Orders</button><button type="button" onclick="wickOpenService('wallet');wickCloseMenu()">Wallet</button><button type="button" onclick="wickOpenSupport();wickCloseMenu()">Support</button></div></header>
    <main id="wickLandingMain">
      <section class="wick-hero"><div class="wick-container wick-hero-grid"><div class="wick-hero-copy"><span class="wick-eyebrow-pill">${escapeHtml(config.general.subheadline)}</span><h1>${escapeHtml(config.general.headline)}</h1><p>${escapeHtml(config.general.description)}</p><div class="wick-actions"><button type="button" class="wick-primary" onclick="wickGoServices()">${escapeHtml(config.general.primary_cta)}</button><button type="button" class="wick-secondary" onclick="wickOpenOrders()">${escapeHtml(config.general.secondary_cta)}</button></div><div class="wick-trust-labels"><span>Fast delivery</span><span>Secure checkout</span><span>Live availability</span></div></div>
        <aside class="wick-quick" id="wickServices"><div class="wick-quick-head"><div><h2>${escapeHtml(config.services.heading)}</h2><p>${escapeHtml(config.services.subtitle)}</p></div><span class="wick-online">Online</span></div><div class="wick-search-wrap"><span class="wick-search-icon">${iconSvg("search")}</span><input id="wickServiceSearch" class="wick-search" type="search" autocomplete="off" placeholder="${escapeHtml(config.general.search_placeholder)}" aria-label="${escapeHtml(config.general.search_placeholder)}"><div id="wickSearchResults" class="wick-search-results"></div></div><div class="wick-quick-grid">${quickServices.map(renderService).join("")}</div></aside>
      </div></section>
      ${config.ranking.enabled ? `<section id="wickOtpRanking" class="wick-section"><div class="wick-container"><div class="wick-section-head"><p class="wick-kicker">Live performance</p><h2>${escapeHtml(config.ranking.heading)}</h2><p>${escapeHtml(config.ranking.subtitle)}</p></div><div id="wickRankingList" class="wick-ranking-grid" aria-live="polite" aria-busy="true"><div class="wick-ranking-skeleton"></div><div class="wick-ranking-skeleton"></div><div class="wick-ranking-skeleton"></div></div><div class="wick-ranking-link"><button type="button" class="wick-link-button" onclick="wickOpenService('numbers')">${escapeHtml(config.ranking.cta_text)}</button></div></div></section>` : ""}
      <section class="wick-section alt" id="wickTrust"><div class="wick-container"><div class="wick-section-head"><p class="wick-kicker">Trust & convenience</p><h2>${escapeHtml(config.trust.heading)}</h2><p>${escapeHtml(config.trust.subtitle)}</p></div><div class="wick-trust-grid"><article class="wick-trust-card"><span class="wick-trust-icon">${iconSvg("bolt")}</span><div><b>Fast delivery</b><span>Digital services without unnecessary waiting.</span></div></article><article class="wick-trust-card"><span class="wick-trust-icon">${iconSvg("shield")}</span><div><b>Secure wallet</b><span>Simple account and wallet checkout flow.</span></div></article><article class="wick-trust-card"><span class="wick-trust-icon">${iconSvg("clock")}</span><div><b>24/7 access</b><span>Shop and manage orders whenever you need to.</span></div></article><article class="wick-trust-card"><span class="wick-trust-icon">${iconSvg("activity")}</span><div><b>Live availability</b><span>Current stock and service availability where supported.</span></div></article></div></div></section>
      ${testimonialsHtml}
      <section class="wick-cta-wrap"><div class="wick-container"><div class="wick-cta"><div><h2>Ready when you are</h2><p>Pick a service and complete your next order in a few taps.</p></div><button type="button" class="wick-secondary" onclick="wickGoServices()">${escapeHtml(config.general.primary_cta)}</button></div></div></section>
    </main>
    <footer id="wickLandingFooter" class="wick-footer"><div class="wick-container"><div class="wick-footer-top"><div class="wick-footer-brand"><b>${escapedName}</b><span>${escapeHtml(config.footer.description)}</span></div><div class="wick-footer-links"><button type="button" onclick="wickGoServices()">Services</button><button type="button" onclick="wickOpenOrders()">Orders</button><button type="button" onclick="wickOpenSupport()">Support</button></div></div><div class="wick-footer-bottom"><span>${escapeHtml(footerCopyright)}</span></div></div></footer>
  </div>`;

  const script = `<script data-wick-store-landing-script-v2>(function(){
    var cfg=${runtime},body=document.body,legacyMain=document.querySelector('body>main.wrap');body.classList.add('wick-landing-active');
    function byId(id){return document.getElementById(id)}function notify(message,error){var toast=byId('wickLandingToast');if(body.classList.contains('wick-landing-active')&&toast){toast.textContent=message;toast.className='wick-toast show'+(error?' error':'');if(window.__wickToastTimer)clearTimeout(window.__wickToastTimer);window.__wickToastTimer=setTimeout(function(){toast.classList.remove('show')},3400);return}if(typeof window.note==='function')return window.note(message,!!error)}
    function serviceExists(key){if(key==='numbers')return !!byId('serviceTabNumbers');if(key==='marketplace')return !!byId('serviceTabMarketplace');if(key==='boostly')return !!byId('serviceTabBoostly');if(key==='rent')return !!document.querySelector('a[data-wick-rent-number]');if(key==='wallet')return !!byId('fundAmount');return false}
    function closeSearch(){var box=byId('wickSearchResults');if(box){box.classList.remove('open');box.innerHTML=''}}function showWorkspace(){body.classList.remove('wick-landing-active');body.classList.add('wick-workspace-active');if(legacyMain&&!byId('wickWorkspaceBack')){var back=document.createElement('button');back.id='wickWorkspaceBack';back.className='wick-workspace-back';back.type='button';back.textContent='← Store home';back.onclick=window.wickBackHome;legacyMain.prepend(back)}}function scrollLegacy(target){setTimeout(function(){var n=typeof target==='string'?document.querySelector(target):target;if(n)n.scrollIntoView({behavior:'smooth',block:'start'})},40)}
    window.wickBackHome=function(){body.classList.remove('wick-workspace-active');body.classList.add('wick-landing-active');closeSearch();window.scrollTo({top:0,behavior:'smooth'})};window.wickGoServices=function(){if(body.classList.contains('wick-workspace-active')){window.wickBackHome();setTimeout(window.wickGoServices,120);return}var n=byId('wickServices');if(n)n.scrollIntoView({behavior:'smooth',block:'center'})};
    window.wickOpenService=function(key){closeSearch();if(!serviceExists(key)){notify('This service is not available in this store right now.',true);return}if(key==='rent'){location.href='/store/'+encodeURIComponent(cfg.slug)+'/rent-number';return}showWorkspace();if(key==='wallet'){scrollLegacy('main.wrap .hero .card:nth-child(2)');return}if(typeof window.switchService==='function')window.switchService(key);scrollLegacy('#panel'+(key.charAt(0).toUpperCase()+key.slice(1)))};
    window.wickOpenOrders=function(){closeSearch();if(!window.token){if(typeof window.openAuth==='function')window.openAuth();return}showWorkspace();if(typeof window.loadCurrentOrders==='function')window.loadCurrentOrders();scrollLegacy('#orders')};window.wickOpenSupport=function(){var hidden=byId('support'),dynamic=hidden&&String(hidden.textContent||'').trim(),phone=String(cfg.supportPhone||'').trim(),email=String(cfg.supportEmail||'').trim();if(phone){location.href='tel:'+phone.replace(/[^+0-9]/g,'');return}if(email){location.href='mailto:'+email;return}if(dynamic){if(dynamic.indexOf('@')>0)location.href='mailto:'+dynamic;else location.href='tel:'+dynamic.replace(/[^+0-9]/g,'');return}notify('Support contact is not configured for this store yet.',true)};
    window.wickToggleMenu=function(){var menu=byId('wickMobileNav'),btn=byId('wickMenuBtn');if(!menu||!btn)return;var open=!menu.classList.contains('open');menu.classList.toggle('open',open);btn.setAttribute('aria-expanded',open?'true':'false')};window.wickCloseMenu=function(){var menu=byId('wickMobileNav'),btn=byId('wickMenuBtn');if(menu)menu.classList.remove('open');if(btn)btn.setAttribute('aria-expanded','false')};
    function syncCustomer(){var sourceBalance=byId('balance'),sourceAccount=byId('accountBtn'),wallet=byId('wickWalletBalance'),accountLabel=byId('wickAccountLabel'),signedIn=!!window.token;if(wallet)wallet.textContent=signedIn&&sourceBalance?'Wallet '+String(sourceBalance.textContent||'₦0'):'Wallet';if(accountLabel)accountLabel.textContent=signedIn&&sourceAccount?String(sourceAccount.textContent||'Account'):'Sign in'}function pruneUnavailable(){document.querySelectorAll('#wickStorefront [data-wick-service]').forEach(function(node){var key=node.getAttribute('data-wick-service');node.hidden=!serviceExists(key)})}
    function searchItems(query){var q=String(query||'').trim().toLowerCase(),results=[];document.querySelectorAll('#wickStorefront [data-wick-service]:not([hidden])').forEach(function(node){var key=node.getAttribute('data-wick-service'),text=(node.getAttribute('data-search')||'')+' '+key;if(!q||text.indexOf(q)>=0)results.push({label:node.querySelector('.wick-service-title')?.textContent||key,sub:'Open service',action:function(){window.wickOpenService(key)}})});if(q&&serviceExists('marketplace'))results.push({label:'Search Marketplace',sub:'Find products for “'+q+'”',action:function(){window.wickOpenService('marketplace');setTimeout(function(){var f=byId('marketSearch');if(f){f.value=q;if(typeof window.loadMarketplace==='function')window.loadMarketplace()}},90)}});if(q&&serviceExists('boostly'))results.push({label:'Search Boostly',sub:'Find social services for “'+q+'”',action:function(){window.wickOpenService('boostly');setTimeout(function(){var f=byId('boostSearch');if(f){f.value=q;if(typeof window.loadBoostly==='function')window.loadBoostly()}},90)}});return results.slice(0,8)}
    function renderSearch(){var input=byId('wickServiceSearch'),box=byId('wickSearchResults');if(!input||!box)return;var q=input.value,items=searchItems(q);if(!String(q||'').trim()){closeSearch();return}box.innerHTML='';if(!items.length){var empty=document.createElement('div');empty.className='wick-search-result';empty.textContent='No matching service';box.appendChild(empty)}else items.forEach(function(item){var btn=document.createElement('button');btn.type='button';btn.className='wick-search-result';var label=document.createElement('span');label.textContent=item.label;var sub=document.createElement('small');sub.textContent=item.sub;btn.append(label,sub);btn.onclick=item.action;box.appendChild(btn)});box.classList.add('open')}
    window.wickOpenRankedNumber=function(serviceCode,countryCode){window.wickOpenService('numbers');setTimeout(async function(){try{var country=byId('country'),service=byId('service');if(!country||!service)return;country.value=String(countryCode);if(typeof window.loadNumberServices==='function')await window.loadNumberServices();var option=Array.from(service.options).find(function(o){return o.value===String(serviceCode)});if(option)service.value=String(serviceCode);if(typeof window.showNumberPrices==='function')await window.showNumberPrices();else if(typeof window.loadNumberCatalog==='function')await window.loadNumberCatalog()}catch(e){notify('Could not load this number right now. Please try again.',true)}},130)};
    function flag(code){var c=String(code||'').toUpperCase();return /^[A-Z]{2}$/.test(c)?String.fromCodePoint.apply(null,Array.from(c).map(function(v){return 127397+v.charCodeAt(0)})):'🌐'}
    async function loadRankings(){var list=byId('wickRankingList');if(!cfg.rankingEnabled||!list)return;try{var r=await fetch('/webhook/wickspend/store/landing/rankings?store_slug='+encodeURIComponent(cfg.slug),{headers:{Accept:'application/json'},cache:'no-store'}),data=await r.json();if(!r.ok||!data.ok||!Array.isArray(data.items))throw Error('ranking');var rows=data.items.slice(0,5);list.innerHTML='';if(!rows.length){list.innerHTML='<div class="wick-ranking-state">Ranking temporarily unavailable. You can still open Buy Number to see live availability.</div>';return}rows.forEach(function(v,i){var card=document.createElement('article');card.className='wick-ranking-card';var top=document.createElement('div');top.className='wick-rank-top';var badge=document.createElement('span');badge.className='wick-rank-badge '+(i===0?'gold':i===1?'silver':i===2?'bronze':'');badge.textContent='#'+(i+1);var live=document.createElement('span');live.className='wick-live-pill';live.textContent='Available now';top.append(badge,live);var country=document.createElement('div');country.className='wick-rank-country';var fl=document.createElement('span');fl.className='wick-rank-flag';fl.textContent=v.flag||flag(v.iso_code);var cc=document.createElement('div');var strong=document.createElement('strong');strong.textContent=v.country_name||'Country';var service=document.createElement('span');service.textContent=v.service_name||v.service_code||'Service';cc.append(strong,service);country.append(fl,cc);var metrics=document.createElement('div');metrics.className='wick-rank-metrics';if(Number.isFinite(Number(v.otp_rate))){var rate=document.createElement('span');rate.innerHTML='<strong>'+Math.round(Number(v.otp_rate))+'%</strong> OTP success';metrics.appendChild(rate)}if(Number.isFinite(Number(v.stock))){var stock=document.createElement('span');stock.innerHTML='<strong>'+Number(v.stock).toLocaleString()+'</strong> available';metrics.appendChild(stock)}var button=document.createElement('button');button.type='button';button.textContent='Buy Number';button.onclick=function(){window.wickOpenRankedNumber(v.service_code,v.country_code)};card.append(top,country,metrics,button);list.appendChild(card)})}catch(e){list.innerHTML='<div class="wick-ranking-state">Ranking temporarily unavailable. You can still open Buy Number to see live availability.</div>'}finally{list.setAttribute('aria-busy','false')}}
    var input=byId('wickServiceSearch');if(input){input.addEventListener('input',renderSearch);input.addEventListener('keydown',function(e){if(e.key==='Escape')closeSearch();if(e.key==='Enter'){e.preventDefault();var items=searchItems(input.value);if(items[0])items[0].action()}})}document.addEventListener('click',function(e){var wrap=document.querySelector('.wick-search-wrap');if(wrap&&!wrap.contains(e.target))closeSearch()});var accountSource=byId('accountBtn'),balanceSource=byId('balance');if(accountSource)new MutationObserver(syncCustomer).observe(accountSource,{childList:true,characterData:true,subtree:true});if(balanceSource)new MutationObserver(syncCustomer).observe(balanceSource,{childList:true,characterData:true,subtree:true});pruneUnavailable();syncCustomer();setTimeout(function(){pruneUnavailable();syncCustomer()},250);setTimeout(syncCustomer,1200);if(cfg.rankingEnabled){if('requestIdleCallback' in window)window.requestIdleCallback(loadRankings,{timeout:1200});else setTimeout(loadRankings,350)}
  })();</script>`;

  return { html, script };
}
