export const PROTOCOL_VERSION = 2;
export const RECEIPT_HEADERS = { 'X-ZoomPaper-Receipt': '1' };
export function metadataEnvelope(paper, requestId) {
  const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) || null : null;
  const metadata = {
    title: text(paper.title, 1000), authors: text(paper.authors, 10000),
    abstractText: text(paper.abstract, 20000), doi: text(paper.doi, 250),
    arxivId: text(paper.arxivId, 80), year: Number.isInteger(paper.year) ? paper.year : null,
    venue: text(paper.venue, 500),
  };
  const envelope = { protocolVersion: PROTOCOL_VERSION, requestId, metadata };
  if (new TextEncoder().encode(JSON.stringify(envelope)).length > 65536) metadata.abstractText = text(paper.abstract, 5000);
  return envelope;
}
export async function handshake(fetcher) {
  try {
    const response = await fetcher('http://127.0.0.1:37541/connector/ping', { headers: RECEIPT_HEADERS, signal: AbortSignal.timeout(1500), cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.appId && data.appId !== 'com.zoompaper.plus') throw new Error('本地端口被其他论文应用占用，请先退出该应用');
    if (data.minProtocolVersion > PROTOCOL_VERSION) throw new Error('App 的导入协议较新，请更新浏览器扩展');
    return data;
  } catch (error) {
    if (error?.message?.startsWith('本地端口') || error?.message?.startsWith('App 的')) throw error;
    return null; // Older App or App not yet launched: deep-link handoff remains available.
  }
}
