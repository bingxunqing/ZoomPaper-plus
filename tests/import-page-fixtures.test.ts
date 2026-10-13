import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';
// @ts-expect-error Native extension module.
import {scrapePaperPage} from '../browser-extension/scrape.js';
// @ts-expect-error Native extension module.
import {detectPaper} from '../browser-extension/detector.js';
afterEach(()=>{vi.unstubAllGlobals();document.head.innerHTML='';document.body.innerHTML='';});
it.each([
 ['acl','https://aclanthology.org/2026.acl-long.8/','ACL 2026'],
 ['arxiv','https://arxiv.org/abs/2601.12345','arXiv 2026'],
 ['openreview','https://openreview.net/forum?id=test','ICLR 2026'],
 ['cvf','https://openaccess.thecvf.com/content/CVPR2026/html/test.html','CVPR 2026'],
 ['proceedings','https://proceedings.iclr.cc/paper_files/paper/2026/hash/test-Abstract-Conference.html','ICLR 2026'],
])('extracts page metadata before PDF parsing: %s',(name,url,venue)=>{
 const html=readFileSync(path.join(process.cwd(),`tests/fixtures/import-pages/${name}.html`),'utf8');document.documentElement.innerHTML=html;vi.stubGlobal('location',{href:url});
 const paper=detectPaper(scrapePaperPage());expect(paper.authors).toBe('A. Author, B. Author');expect(paper.abstract).toBe('Fixture abstract');expect(paper.venue).toBe(venue);expect(paper.pdfUrl).toContain('https://');
});
it('does not use another article from a multi-paper JSON-LD page',()=>{
 vi.stubGlobal('location',{href:'https://example.org/index'});document.head.innerHTML='<script type="application/ld+json">[{"@type":"ScholarlyArticle","url":"https://example.org/a","name":"Wrong A","encoding":{"contentUrl":"https://example.org/a.pdf"}},{"@type":"ScholarlyArticle","url":"https://example.org/b","name":"Wrong B"}]</script>';document.title='Index';const result=scrapePaperPage();expect(result.title).toBe('Index');expect(result.metaPdfUrls).toEqual([]);
});

it('ignores malformed structured fields without breaking page detection',()=>{
 document.head.innerHTML='<meta name="citation_title" content="Valid title"><script type="application/ld+json">{"@type":"ScholarlyArticle","abstract":{"@value":"Rich text"},"datePublished":2026,"isPartOf":{"name":{"bad":1}}}</script>';expect(()=>scrapePaperPage()).not.toThrow();expect(scrapePaperPage().title).toBe('Valid title');
});
