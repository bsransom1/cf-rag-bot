/**
 * Turn first bare / plain URL mentions of allowlisted domains into Markdown
 * links so react-markdown renders clickable anchors. Skips text already
 * inside `[label](url)` spans. Order: longer / https patterns before bare hosts.
 */

function isInsideMarkdownLink(s: string, start: number): boolean {
  const before = s.slice(0, start);
  const lastOpen = before.lastIndexOf("[");
  if (lastOpen === -1) return false;
  const fromBracket = s.slice(lastOpen);
  const idxParen = fromBracket.indexOf("](");
  if (idxParen === -1) return false;
  const linkTextStart = lastOpen + 1;
  const linkTextEnd = lastOpen + idxParen;
  if (start >= linkTextStart && start < linkTextEnd) return true;
  const urlStart = lastOpen + idxParen + 2;
  const closeParen = s.indexOf(")", urlStart);
  if (closeParen === -1) return false;
  if (start >= urlStart && start < closeParen) return true;
  return false;
}

type LinkRule = { re: RegExp; href: string; label: string };

const RULES: LinkRule[] = [
  {
    re: /\bstudiolegalemetta\.com\/booking_step_one\/booking-step-1-other\/?/i,
    href: "https://studiolegalemetta.com/booking_step_one/booking-step-1-other/",
    label: "Studio Legale Metta",
  },
  {
    re: /\bhttps:\/\/studiolegalemetta\.com\/booking_step_one\/booking-step-1-other\/?/i,
    href: "https://studiolegalemetta.com/booking_step_one/booking-step-1-other/",
    label: "Studio Legale Metta",
  },
  {
    re: /\bitaliannotary\.com\/business\/register\b/i,
    href: "https://italiannotary.com/business/register",
    label: "italiannotary.com/business/register",
  },
  {
    re: /\bitaliannotary\.com\/terms-of-service\b/i,
    href: "https://italiannotary.com/terms-of-service",
    label: "italiannotary.com/terms-of-service",
  },
  {
    re: /\bitaliannotary\.com\/privacy-policy\b/i,
    href: "https://italiannotary.com/privacy-policy",
    label: "italiannotary.com/privacy-policy",
  },
  {
    re: /\bitaliannotary\.com\/contact-us\b/i,
    href: "https://italiannotary.com/contact-us",
    label: "italiannotary.com/contact-us",
  },
  {
    re: /\bitaliannotary\.com\/order\b/i,
    href: "https://italiannotary.com/order",
    label: "italiannotary.com/order",
  },
  {
    re: /\bhttps:\/\/affiliate\.italiannotary\.com\b/i,
    href: "https://affiliate.italiannotary.com",
    label: "affiliate.italiannotary.com",
  },
  {
    re: /\baffiliate\.italiannotary\.com\b/i,
    href: "https://affiliate.italiannotary.com",
    label: "affiliate.italiannotary.com",
  },
  {
    re: /\binfo@italiannotary\.com\b/i,
    href: "mailto:info@italiannotary.com",
    label: "info@italiannotary.com",
  },
  {
    re: /\bhttps:\/\/italiannotary\.com\b/i,
    href: "https://italiannotary.com",
    label: "ItalianNotary.com",
  },
  {
    re: /\bItalianNotary\.com\b/i,
    href: "https://italiannotary.com",
    label: "ItalianNotary.com",
  },
  {
    re: /\bItalianVisa\.com\b/i,
    href: "https://ItalianVisa.com",
    label: "ItalianVisa.com",
  },
  {
    re: /\bhttps:\/\/CodiceFiscale\.ai\b/i,
    href: "https://CodiceFiscale.ai",
    label: "CodiceFiscale.ai",
  },
  {
    re: /\bCodiceFiscale\.ai\b/i,
    href: "https://CodiceFiscale.ai",
    label: "CodiceFiscale.ai",
  },
  {
    re: /\bhttps:\/\/italiancodicefiscale\.com\b/i,
    href: "https://ItalianCodiceFiscale.com",
    label: "ItalianCodiceFiscale.com",
  },
  {
    re: /\bItalianCodiceFiscale\.com\b/i,
    href: "https://ItalianCodiceFiscale.com",
    label: "ItalianCodiceFiscale.com",
  },
  {
    re: /\bhttps:\/\/ItalianTaxes\.com\b/i,
    href: "https://ItalianTaxes.com",
    label: "ItalianTaxes.com",
  },
  {
    re: /\bItalianTaxes\.com\b/i,
    href: "https://ItalianTaxes.com",
    label: "ItalianTaxes.com",
  },
];

/**
 * At most one substitution per rule (first match that is not inside an
 * existing markdown link).
 */
export function linkifyAllowlistedDomains(markdown: string): string {
  let s = markdown;
  for (const { re, href, label } of RULES) {
    re.lastIndex = 0;
    const m = re.exec(s);
    if (!m) continue;
    const start = m.index;
    if (isInsideMarkdownLink(s, start)) continue;
    const raw = m[0];
    const display = raw.toLowerCase().startsWith("http") ? label : raw;
    s = s.slice(0, start) + `[${display}](${href})` + s.slice(start + raw.length);
  }
  return s;
}
