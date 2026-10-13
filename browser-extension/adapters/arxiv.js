export default {
id: "arxiv",
    match: (url) => ["arxiv.org", "export.arxiv.org"].includes(url.hostname) && url.pathname.startsWith("/abs/"),
    pdf: (url) => `${url.origin}/pdf/${url.pathname.slice(5)}`
};
