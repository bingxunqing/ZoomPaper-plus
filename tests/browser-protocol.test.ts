import { it,expect } from 'vitest';
// @ts-expect-error Native browser extension module.
import { metadataEnvelope,handshake } from '../browser-extension/protocol.js';
// @ts-expect-error Native browser extension module.
import { resolveLandingPdf } from '../browser-extension/adapters/registry.js';
it('bounds large multilingual metadata without putting it in a URL',()=>{
 const result=metadataEnvelope({title:'论文',authors:'人'.repeat(10000),abstract:'文'.repeat(20000)},'request');expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThan(65536);expect(result.metadata.title).toBe('论文');expect(result.requestId).toBe('request');
});
it('supports an older/offline App but rejects another app on the port',async()=>{
 expect(await handshake(async()=>{throw new Error('offline');})).toBe(null);
 await expect(handshake(async()=>({ok:true,json:async()=>({appId:'com.other'})}))).rejects.toThrow('其他论文应用');
 await expect(handshake(async()=>({ok:true,json:async()=>({minProtocolVersion:3})}))).rejects.toThrow('更新浏览器扩展');
});
it.each([
 ['https://aclanthology.org/2026.acl-long.8/','https://aclanthology.org/2026.acl-long.8.pdf','acl-anthology'],
 ['https://arxiv.org/abs/2601.12345v2','https://arxiv.org/pdf/2601.12345v2','arxiv'],
 ['https://openreview.net/forum?id=7X91AAKL5B','https://openreview.net/pdf?id=7X91AAKL5B','openreview'],
 ['https://openaccess.thecvf.com/content/CVPR2026/html/test.html','https://openaccess.thecvf.com/content/CVPR2026/papers/test.pdf','cvf-open-access'],
 ['https://proceedings.iclr.cc/paper_files/paper/2026/hash/example-Abstract-Conference.html','https://proceedings.iclr.cc/paper_files/paper/2026/file/example-Paper-Conference.pdf','neurips'],
])('isolates the landing page rule for %s',(url,pdf,id)=>{expect(resolveLandingPdf(url)).toEqual({url:pdf,adapterId:id});});
it('leaves unknown and invalid websites to generic detection',()=>{expect(resolveLandingPdf('https://unknown.example/paper')).toBe(null);expect(resolveLandingPdf('invalid')).toBe(null);});
