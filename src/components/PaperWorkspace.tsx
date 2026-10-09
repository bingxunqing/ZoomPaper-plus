import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BookOpen, Library as LibraryIcon, RotateCcw, X } from 'lucide-react';
import { Library } from '@/pages/Library';
import { Reader } from '@/pages/Reader';
import { getPaper, listPapers, type BackgroundJob } from '@/lib/api';
import { closeWorkspacePaper, openWorkspacePaper, restoreWorkspace } from '@/lib/workspace';
import { IconTooltip } from './ui/icon-tooltip';
const KEY = 'zoompaper.workspace';
export interface WorkspaceHandle { open: (id: string, page?: number, background?: boolean) => void; resume: () => void; }
export const PaperWorkspace = forwardRef<WorkspaceHandle, { active: boolean; jobs: BackgroundJob[]; refreshSignal: number; onTitleChange: (title: string) => void }>(function PaperWorkspace({ active, jobs, refreshSignal, onTitleChange }, ref) {
  const [state, setState] = useState(() => restoreWorkspace(localStorage.getItem(KEY)));
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [pages, setPages] = useState<Record<string, number | undefined>>({});
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set());
  useEffect(() => { if (active && state.active !== "library") setVisitedTabs(current => current.has(state.active) ? current : new Set([...current, state.active])); }, [active, state.active]);
  const closed = useRef<string[]>([]);
  const latest = useRef(state); latest.current = state;
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { listPapers().then((papers) => { const ids = new Set(papers.filter(p => !p.deleted_at).map(p => p.id)); setTitles(current => ({ ...Object.fromEntries(papers.map(p => [p.id, p.title])), ...current })); setState(current => restoreWorkspace(JSON.stringify({ ...current, tabs: current.tabs.filter(id => ids.has(id)) }))); }).catch(() => {}); }, [refreshSignal]);
  const open = (id: string, page?: number, background = false) => {
    if (page != null) setPages(prev => ({ ...prev, [id]: page }));
    setState(current => openWorkspacePaper(current, id, background));
    void getPaper(id).then(paper => setTitles(prev => ({ ...prev, [id]: paper.title }))).catch(() => {});
  };
  const close = (id: string) => { closed.current.push(id); setVisitedTabs(current => { const next = new Set(current); next.delete(id); return next; }); setState(current => closeWorkspacePaper(current, id)); };
  const reopen = () => { const id = closed.current.pop(); if (id) open(id); };
  useImperativeHandle(ref, () => ({ open, resume: () => { const current = latest.current; if (current.lastRead) setState({ ...current, active: current.lastRead }); else { void listPapers().then(papers => { const recent = papers.filter(p => !p.deleted_at && p.last_read_at).sort((a,b) => (b.last_read_at ?? 0)-(a.last_read_at ?? 0))[0]; if (recent) open(recent.id); }).catch(() => {}); } } }));
  useEffect(() => {
    if (!active) return;
    const keys = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === 'w' && latest.current.active !== 'library') { event.preventDefault(); close(latest.current.active); }
      if (event.shiftKey && event.key.toLowerCase() === 't') { event.preventDefault(); reopen(); }
      if (event.key === 'Tab') { event.preventDefault(); const ids = ['library', ...latest.current.tabs]; const next = ids[(ids.indexOf(latest.current.active) + (event.shiftKey ? ids.length - 1 : 1)) % ids.length]; setState(current => ({ ...current, active: next, lastRead: next === 'library' ? current.lastRead : next })); }
    }; window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, [active]);
  useEffect(() => { if (active && state.active === "library") onTitleChange(""); }, [active, state.active, onTitleChange]);
  const readers = [...new Set([...state.tabs.filter(id => visitedTabs.has(id) || (active && state.active === id)), ...busy])];
  return <section className="min-h-0 min-w-0 flex-1 flex-col" style={{ display: active ? 'flex' : 'none' }} aria-label="论文工作区">
    <div role="tablist" aria-label="打开的论文" className="flex h-11 shrink-0 items-end gap-1 overflow-x-auto border-b border-zp-border bg-zp-subtle px-3">
      <button role="tab" aria-selected={state.active === 'library'} onClick={() => setState(current => ({ ...current, active: 'library' }))} className={`flex h-9 shrink-0 items-center gap-2 rounded-t-lg px-4 text-sm ${state.active === 'library' ? 'bg-white text-zp-primary dark:bg-zp-surface' : 'text-zp-tertiary hover:bg-zp-surface-hover'}`}><LibraryIcon size={15} />论文库</button>
      {state.tabs.map(id => <div key={id} draggable onDragStart={event => event.dataTransfer.setData('text/plain', id)} onDragOver={event => event.preventDefault()} onDrop={event => { const from = event.dataTransfer.getData('text/plain'); if (!state.tabs.includes(from) || from === id) return; setState(current => { const tabs = current.tabs.filter(tab => tab !== from); tabs.splice(tabs.indexOf(id), 0, from); return { ...current, tabs }; }); }} onAuxClick={event => { if (event.button === 1) close(id); }} className={`flex h-9 w-52 shrink-0 items-center rounded-t-lg px-2 ${state.active === id ? 'bg-white dark:bg-zp-surface' : 'text-zp-tertiary hover:bg-zp-surface-hover'}`}>
        <button role="tab" aria-selected={state.active === id} title={titles[id] ?? '论文'} onClick={() => setState(current => ({ ...current, active: id, lastRead: id }))} className="flex min-w-0 flex-1 items-center gap-2 text-sm"><BookOpen size={14} className="shrink-0" /><span className="truncate">{titles[id] ?? '论文'}</span></button>
        <IconTooltip label="关闭论文标签"><button aria-label={`关闭 ${titles[id] ?? '论文'}`} onClick={() => close(id)} className="ml-1 rounded p-1 text-zp-tertiary hover:bg-zp-subtle"><X size={13} /></button></IconTooltip>
      </div>)}
      {closed.current.length > 0 && <IconTooltip label="重新打开已关闭标签"><button aria-label="重新打开已关闭标签" onClick={reopen} className="mb-1 shrink-0 rounded p-2 text-zp-tertiary"><RotateCcw size={14} /></button></IconTooltip>}
    </div>
    <div className="min-h-0 flex-1" style={{ display: state.active === 'library' ? 'flex' : 'none' }}><Library refreshSignal={refreshSignal} jobs={jobs} onOpenPaper={id => open(id)} onOpenBackground={id => open(id, undefined, true)} onOpenPapers={ids => ids.forEach(id => open(id, undefined, true))} /></div>
    {readers.map(id => <div key={id} className="min-h-0 flex-1 flex-col p-6" style={{ display: state.active === id ? 'flex' : 'none' }}><Reader paperId={id} active={active && state.active === id} initialPageIdx={pages[id]} refreshSignal={refreshSignal} onBack={() => setState(current => ({ ...current, active: 'library' }))} onBusyChange={running => setBusy(current => { if (current.has(id) === running) return current; const next = new Set(current); if (running) next.add(id); else next.delete(id); return next; })} onTitleChange={title => { setTitles(current => current[id] === title ? current : ({ ...current, [id]: title })); if (active && state.active === id) onTitleChange(title); }} /></div>)}
  </section>;
});
