function absoluteUrl(value, base) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" ? url.href : null;
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

export function detectPaper({ pageUrl, linkUrl, title, citationPdfUrl, links = [] }) {
  const page = absoluteUrl(pageUrl, pageUrl);
  const selectedLink = absoluteUrl(linkUrl, pageUrl);
  const citation = absoluteUrl(citationPdfUrl, pageUrl);
  let pdfUrl = isPdfUrl(selectedLink) ? selectedLink : citation;

  if (!pdfUrl && page) {
    const url = new URL(page);
    if (url.hostname === "aclanthology.org" && !isPdfUrl(page)) {
      pdfUrl = `${url.origin}${url.pathname.replace(/\/$/, "")}.pdf`;
    } else if (url.hostname === "arxiv.org" && url.pathname.startsWith("/abs/")) {
      pdfUrl = `${url.origin}/pdf/${url.pathname.slice(5)}`;
    } else if (url.hostname === "openreview.net" && url.pathname === "/forum" && url.searchParams.has("id")) {
      pdfUrl = `${url.origin}/pdf?id=${encodeURIComponent(url.searchParams.get("id"))}`;
    } else if (isPdfUrl(page)) {
      pdfUrl = page;
    }
  }

  if (!pdfUrl) {
    const candidates = links
      .map((link) => ({ ...link, href: absoluteUrl(link.href, pageUrl) }))
      .filter((link) => link.href && isPdfUrl(link.href))
      .filter((link) => !/checklist|supplement|appendix|attachment/i.test(`${link.text} ${link.title} ${link.href}`))
      .sort((a, b) => {
        const score = (link) => (/^(pdf|download pdf|paper)$/i.test(link.text.trim()) ? 2 : /pdf/i.test(`${link.text} ${link.title}`) ? 1 : 0);
        return score(b) - score(a);
      });
    pdfUrl = candidates[0]?.href ?? null;
  }

  return pdfUrl ? { pdfUrl, title: title?.trim() || "未命名论文", sourceUrl: page } : null;
}
