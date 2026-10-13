export default {
    id: "acl-anthology",
    match: (url) => url.hostname === "aclanthology.org" && /^\/\d{4}[^/]+\/$/.test(url.pathname),
    pdf: (url) => `${url.origin}${url.pathname.replace(/\/$/, "")}.pdf`
};
