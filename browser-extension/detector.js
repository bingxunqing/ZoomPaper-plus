import { resolveLandingPdf } from './adapters/registry.js';
export function absoluteUrl(value, base) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.includes(":")) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isPdfUrl(value) {
  try {
    return /\.pdf$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

function looksLikePdfEndpoint(value) {
  return isPdfUrl(value) || /\/pdf(?:\/|\?|$)|download.?pdf|pdfdirect|[?&](?:format|type)=pdf(?:&|$)/i.test(value || "");
}

function landingPagePdf(value) { return resolveLandingPdf(value)?.url || null; }

function candidateScore(link) {
  const description = `${link.text || ""} ${link.title || ""} ${link.rel || ""} ${link.type || ""}`;
  const href = link.href || "";
  if (/checklist|supplement|appendix|attachment|slides|poster|code/i.test(`${description} ${href}`)) return -100;
  let score = 0;
  if (/application\/pdf/i.test(link.type || "")) score += 8;
  if (/^(pdf|download pdf|paper|full text|full text pdf)$/i.test((link.text || "").trim())) score += 7;
  if (/pdf|full.?text|download/i.test(description)) score += 4;
  if (isPdfUrl(href)) score += 5;
  if (looksLikePdfEndpoint(href)) score += 3;
  if (landingPagePdf(href)) score += 5;
  if (/pre-?print|paper|full.?text|全文|下载|论文/i.test(description)) score += 3;
  return score;
}

export function detectPaper({
  pageUrl,
  linkUrl,
  title,
  citationPdfUrl,
  venue,
  publicationDate,
  doi,
  authors,
  abstract,
  arxivId,
  metaPdfUrls = [],
  links = [],
}) {
  const page = absoluteUrl(pageUrl, pageUrl);
  const pdfUrl = detectPdfCandidates({ pageUrl, linkUrl, citationPdfUrl, metaPdfUrls, links })[0]?.url ?? null;

  const githubUrl = links
    .map((link) => absoluteUrl(link.href, pageUrl))
    .find((value) => {
      if (!value) return false;
      try {
        const url = new URL(value);
        return url.hostname === "github.com" && url.pathname.split("/").filter(Boolean).length >= 2;
      } catch {
        return false;
      }
    }) || null;
  const year = publicationDate?.match(/\b(19|20)\d{2}\b/)?.[0];
  const normalizedVenue = venue?.trim()
    ? `${venue.trim()}${year && !venue.includes(year) ? ` ${year}` : ""}`
    : null;

  return pdfUrl ? {
    pdfUrl,
    title: title?.trim() || "未命名论文",
    sourceUrl: page,
    ...(githubUrl ? { githubUrl } : {}),
    ...(normalizedVenue ? { venue: normalizedVenue } : {}),
    ...(doi ? { doi } : {}),
    ...(authors ? { authors } : {}),
    ...(abstract ? { abstract } : {}),
    ...((arxivId || resolveLandingPdf(page)?.adapterId === 'arxiv') ? { arxivId: arxivId || new URL(page).pathname.slice(5) } : {}),
    ...(year ? { year: Number(year) } : {}),
  } : null;
}

// Keep all credible full-text routes. An explicit right-click target takes precedence.
export function detectPdfCandidates({ pageUrl, linkUrl, citationPdfUrl, metaPdfUrls = [], links = [] }) {
  const ranked = [];
  const add = (raw, score, label, automatic = false) => {
    const safe = absoluteUrl(raw, pageUrl);
    if (!safe) return;
    const url = landingPagePdf(safe) || safe;
    ranked.push({ url, score, label, automatic, adapterId: resolveLandingPdf(safe)?.adapterId || null });
  };
  if (linkUrl) add(linkUrl, 100, "选中的链接", true);
  if (citationPdfUrl) add(citationPdfUrl, 90, "论文全文", true);
  for (const raw of metaPdfUrls) add(raw, 85, "页面全文元数据", true);
  const page = absoluteUrl(pageUrl, pageUrl);
  if (page) {
    const url = new URL(page);
    const adapter = resolveLandingPdf(page);
    if (adapter) add(page, 80, "官方全文", true);
    else if (isPdfUrl(page) || looksLikePdfEndpoint(page)) add(page, 80, "当前 PDF", true);
  }
  for (const link of links) {
    const href = absoluteUrl(link.href, pageUrl);
    if (!href) continue;
    const score = candidateScore({ ...link, href });
    if (score >= 5) add(href, score, (link.text || "全文链接").trim().slice(0, 100));
  }
  const seen = new Set();
  return ranked.sort((a, b) => b.score - a.score).filter(({ url }) => {
    if (seen.has(url)) return false;
    seen.add(url); return true;
  }).slice(0, 12);
}
