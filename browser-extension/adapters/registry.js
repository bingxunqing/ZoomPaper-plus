import acl from './acl-anthology.js';
import arxiv from './arxiv.js';
import openreview from './openreview.js';
import cvf from './cvf-open-access.js';
import proceedings from './neurips.js';
/** Each adapter is isolated; structured page metadata remains the common fallback. */
export const SITE_ADAPTERS = [acl, arxiv, openreview, cvf, proceedings].map(adapter => ({ priority:100, ...adapter })).sort((a,b)=>b.priority-a.priority);
export function resolveLandingPdf(value) {
  try {
    const url = new URL(value);
    for(const adapter of SITE_ADAPTERS) {
      try {if(adapter.match(url)) {const result=adapter.pdf(url);if(result)return {url:result,adapterId:adapter.id};}} catch { /* A broken rule must not disable generic detection. */ }
    }
  } catch { /* Invalid page URL. */ }
  return null;
}
