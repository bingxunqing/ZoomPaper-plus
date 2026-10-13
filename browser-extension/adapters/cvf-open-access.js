export default {
id: "cvf-open-access",
    match: (url) => url.hostname === "openaccess.thecvf.com" && url.pathname.includes("/html/") && url.pathname.endsWith(".html"),
    pdf: (url) => `${url.origin}${url.pathname.replace("/html/", "/papers/").replace(/\.html$/, ".pdf")}`
};
