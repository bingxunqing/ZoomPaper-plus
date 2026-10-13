export function scrapePaperPage() {
  const meta = (name) => [...document.querySelectorAll('meta[name],meta[property]')].find((node) =>
    (node.getAttribute('name') || node.getAttribute('property') || '').toLowerCase() === name.toLowerCase())?.content || null;
  const text = value => typeof value==='string' ? value : null;
  let article = null;
  const metaValues = (selectors) => selectors.flatMap((selector) =>
    [...document.querySelectorAll(selector)].map((element) => element.content || element.href || element.src).filter(Boolean)
  );
  const nodes = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const pending = [JSON.parse(script.textContent || 'null')];
      while (pending.length && nodes.length < 1000) {
        const value = pending.shift();
        if (!value || typeof value !== 'object') continue;
        if (Array.isArray(value)) { pending.push(...value); continue; }
        nodes.push(value);
        pending.push(...Object.values(value).filter((child) => child && typeof child === 'object'));
      }
    } catch { /* Ignore malformed JSON-LD and continue with citation metadata. */ }
  }
  const isArticle = (value) => (Array.isArray(value['@type']) ? value['@type'] : [value['@type']])
    .some((type) => /^(ScholarlyArticle|Article|TechArticle)$/.test(type || ''));
  const articles = nodes.filter(isArticle);
  article = articles.find((value) => [value.url, value['@id']].some((url) => {
    try { return typeof url === 'string' && new URL(url, location.href).href.split('#')[0] === location.href.split('#')[0]; } catch { return false; }
  })) || (articles.length===1 ? articles[0] : null);
  const pdfUrls = [];
  const pending = article ? [article] : articles.length>1 ? [] : [...nodes];
  let visited=0;
  while (pending.length && visited++<1000) {
    const value = pending.shift();
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value)) { pending.push(...value); continue; }
    if (article && value !== article && isArticle(value)) continue;
    if (typeof value.contentUrl === 'string' && (/pdf/i.test(value.encodingFormat || value.fileFormat || '') || /\.pdf(?:$|\?)/i.test(value.contentUrl))) pdfUrls.push(value.contentUrl);
    if (typeof value.url === 'string' && /pdf/i.test(value.encodingFormat || value.fileFormat || '')) pdfUrls.push(value.url);
    if (article) pending.push(...Object.values(value).filter((child) => child && typeof child === 'object'));
  }
  const structuredVenue = article?.isPartOf;
  const venueName = typeof structuredVenue === 'string' ? structuredVenue : structuredVenue?.name;
  const pageIcon = [...document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]')]
    .sort((a, b) => (parseInt(b.sizes?.value || '0') || 0) - (parseInt(a.sizes?.value || '0') || 0))[0]?.href;
  return {
    pageUrl: location.href,
    iconUrl: pageIcon || null,
    title: meta("citation_title") || meta("dc.title") || text(article?.headline) || text(article?.name) || document.querySelector("h1")?.textContent || document.title,
    authors: [...document.querySelectorAll('meta[name="citation_author"]')].map(n => n.content).filter(Boolean).slice(0, 100).join(', ') || (Array.isArray(article?.author) ? article.author : [article?.author]).filter(Boolean).map(a => typeof a === 'string' ? a : a.name).filter(Boolean).join(', ') || null,
    abstract: (meta("citation_abstract") || meta("dc.description") || text(article?.abstract) || text(article?.description) || null)?.slice(0, 20000),
    arxivId: meta("citation_arxiv_id") || null,
    citationPdfUrl: meta("citation_pdf_url"),
    doi: meta("citation_doi") || meta("dc.identifier.doi") || (typeof article?.identifier === 'string' ? article.identifier : text(article?.identifier?.value)) || null,
    venue: meta("citation_conference_title") || meta("citation_journal_title") || meta("citation_inbook_title") || text(venueName),
    publicationDate: meta("citation_publication_date") || meta("citation_date") || text(article?.datePublished),
    metaPdfUrls: [
      ...metaValues([
        'meta[name="eprints.document_url"]',
        'meta[name="pdf_url"]',
        'meta[name="fulltext_pdf"]',
        'meta[property="og:pdf"]',
        'link[type="application/pdf"]',
        'link[rel="alternate"][href$=".pdf"]',
        'embed[type="application/pdf"]',
        'iframe[src$=".pdf"]',
      ]),
      ...pdfUrls,
    ],
    links: [...document.querySelectorAll("a[href]")].slice(0, 500).map((anchor) => ({
      href: anchor.href,
      text: (anchor.textContent || "").slice(0,1000),
      title: anchor.title || "",
      context: (anchor.parentElement?.textContent || "").slice(0,2000),
      rel: anchor.rel || "",
      type: anchor.type || "",
    })),
  };
}
