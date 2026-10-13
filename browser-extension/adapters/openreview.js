export default {
id: "openreview",
    match: (url) => url.hostname === "openreview.net" && url.pathname === "/forum" && url.searchParams.has("id"),
    pdf: (url) => `${url.origin}/pdf?id=${encodeURIComponent(url.searchParams.get("id"))}`
};
