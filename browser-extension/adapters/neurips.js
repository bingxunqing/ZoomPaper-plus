export default {
id: "neurips",
    match: (url) => /^(papers|proceedings)\.(?:neurips|nips|iclr)\.cc$/.test(url.hostname) && /-Abstract(?:-Conference)?\.html$/.test(url.pathname),
    pdf: (url) => `${url.origin}${url.pathname.replace("/hash/", "/file/").replace("-Abstract", "-Paper").replace(/\.html$/, ".pdf")}`,
  };
