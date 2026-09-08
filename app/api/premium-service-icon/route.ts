import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DOMAIN_OVERRIDES: Readonly<Record<string, string>> = {
  "7eleven": "7-eleven.com",
  aarp: "aarp.org",
  aistudentpack: "github.com",
  aliexpress: "aliexpress.com",
  ashleymaadison: "ashleymadison.com",
  bankamerica: "bankofamerica.com",
  battlenet: "battle.net",
  bigolive: "bigo.tv",
  blackpeople: "blackpeoplemeet.com",
  cashapp: "cash.app",
  chatgpt: "openai.com",
  chime: "chime.com",
  cloudchat: "cloudchat.com",
  craigslist: "craigslist.org",
  cursor: "cursor.com",
  doordash: "doordash.com",
  douyin: "douyin.com",
  dutchbros: "dutchbros.com",
  facebook: "facebook.com",
  foodpanda: "foodpanda.com",
  freenow: "free-now.com",
  github: "github.com",
  google: "google.com",
  googlechat: "chat.google.com",
  googlemessenger: "messages.google.com",
  googlevoice: "voice.google.com",
  grindr: "grindr.com",
  hardrock: "hardrock.com",
  instagram: "instagram.com",
  ipsosisay: "ipsosisay.com",
  jdcom: "jd.com",
  kakaotalk: "kakaocorp.com",
  linemessenger: "line.me",
  linkedin: "linkedin.com",
  microsoft: "microsoft.com",
  moneylion: "moneylion.com",
  my11circle: "my11circle.com",
  ncsoft: "ncsoft.com",
  niftygateway: "niftygateway.com",
  nobroker: "nobroker.in",
  openai: "openai.com",
  paypal: "paypal.com",
  pinduoduo: "pinduoduo.com",
  pof: "pof.com",
  protonmail: "proton.me",
  reddit: "reddit.com",
  sahibinden: "sahibinden.com",
  signal: "signal.org",
  snapchat: "snapchat.com",
  sweetring: "sweetring.com",
  taptap: "taptap.io",
  telegram: "telegram.org",
  tencentqq: "qq.com",
  tiktok: "tiktok.com",
  tinder: "tinder.com",
  truecaller: "truecaller.com",
  truthsocial: "truthsocial.com",
  twitter: "x.com",
  uber: "uber.com",
  venmo: "venmo.com",
  viber: "viber.com",
  vk: "vk.com",
  walmart: "walmart.com",
  wechat: "wechat.com",
  whatsapp: "whatsapp.com",
  x: "x.com",
  yahoo: "yahoo.com",
};

const SIMPLE_ICON_ALIASES: Readonly<Record<string, string>> = {
  bankamerica: "bankofamerica",
  battlenet: "battledotnet",
  chatgpt: "openai",
  googlemessenger: "googlemessages",
  linemessenger: "line",
  protonmail: "protonmail",
  twitter: "x",
};

function baseKey(value: string) {
  return value.trim().toLowerCase()
    .replace(/_(du|sm|re|canada|co)$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

async function fetchImage(url: string) {
  try {
    const response = await fetch(url, { next: { revalidate: 2592000 } });
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.startsWith("image/")) return null;
    return { body: await response.arrayBuffer(), type };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = baseKey(url.searchParams.get("code") || "");
  const name = baseKey(url.searchParams.get("name") || "");
  const key = code || name;
  if (!key) return new NextResponse(null, { status: 404 });

  const iconSlug = SIMPLE_ICON_ALIASES[key] || key;
  const simpleIcon = await fetchImage(`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${encodeURIComponent(iconSlug)}.svg`);
  if (simpleIcon) {
    return new NextResponse(simpleIcon.body, {
      headers: {
        "Content-Type": simpleIcon.type,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const domain = DOMAIN_OVERRIDES[key] || DOMAIN_OVERRIDES[name] || `${key}.com`;
  const favicon = await fetchImage(`https://www.google.com/s2/favicons?domain_url=https://${encodeURIComponent(domain)}&sz=128`);
  if (!favicon) return new NextResponse(null, { status: 404 });

  return new NextResponse(favicon.body, {
    headers: {
      "Content-Type": favicon.type,
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=2592000",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
