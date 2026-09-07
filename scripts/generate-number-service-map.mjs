import fs from "node:fs";

const source = process.argv[2];
if (!source) throw new Error("Pass the extracted SMSBower service TSV path.");

const rows = fs.readFileSync(source, "utf8").trim().split("\n").slice(1).map((line) => line.split("\t"));
const services = new Map();
const icons = new Map();
for (const [rawCode, rawName, , rawIcon] of rows) {
  const code = String(rawCode || "").trim().toLowerCase();
  const name = String(rawName || "").trim();
  if (code && name && !services.has(code)) services.set(code, name);
  const icon = String(rawIcon || "").trim();
  if (code && icon && !icon.includes("noimage") && !icons.has(code)) {
    icons.set(code, icon.startsWith("http") ? icon : `https://smsbower.app${icon}`);
  }
}

// The WickSpend backend keeps these established, descriptive codes for its
// most-used products in addition to the provider's compact catalog codes.
for (const [code, name] of Object.entries({
  facebook: "Facebook",
  google: "Google / Gmail",
  instagram: "Instagram",
  telegram: "Telegram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
})) services.set(code, name);

const entries = [...services].sort(([a], [b]) => a.localeCompare(b));
const body = entries.map(([code, name]) => `  ${JSON.stringify(code)}: ${JSON.stringify(name)},`).join("\n");
const output = `// Generated from the public service table documented by the catalog provider.\n// Keep this local so provider details never have to be sent to the browser.\nexport const NUMBER_SERVICE_NAMES: Readonly<Record<string, string>> = {\n${body}\n};\n`;
fs.writeFileSync("lib/number-service-names.ts", output);

const iconAliases = { facebook: "fb", google: "go", instagram: "ig", telegram: "tg", tiktok: "lf", whatsapp: "wa" };
for (const [alias, sourceCode] of Object.entries(iconAliases)) {
  if (icons.has(sourceCode)) icons.set(alias, icons.get(sourceCode));
}
const iconBody = [...icons].sort(([a], [b]) => a.localeCompare(b)).map(([code, url]) => `  ${JSON.stringify(code)}: ${JSON.stringify(url)},`).join("\n");
fs.writeFileSync("lib/number-service-icon-sources.ts", `// Server-only source map for the WickSpend icon proxy.\nexport const NUMBER_SERVICE_ICON_SOURCES: Readonly<Record<string, string>> = {\n${iconBody}\n};\n`);
