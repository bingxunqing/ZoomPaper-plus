import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, useReducedMotion } from "motion/react";
import { BookOpen, ChevronDown, ListTodo, RotateCcw, X } from "lucide-react";
import { cancelJob, retryJob, type BackgroundJob } from "@/lib/api";
import type { BrowserImportPhase } from "./BrowserImportNotice";
import { IconTooltip } from "@/components/ui/icon-tooltip";

const stages: Record<string, string> = {
  queued: "等待处理", uploading: "正在上传", pending: "云端排队", converting: "正在转换",
  running: "正在解析", downloading: "正在获取正文", reconnecting: "正在重连",
};
const kinds: Record<string, string> = { parse: "解析", index: "建立索引", translate: "翻译标题与摘要", doi: "补全出版信息" };
const active = (job: BackgroundJob) => job.status === "queued" || job.status === "running" || job.status === "canceling";
export function jobLabel(job: BackgroundJob) {
  if (job.status === "canceling") return "正在停止";
  if (job.status === "failed") return `${kinds[job.kind]}失败`;
  if (job.status === "canceled") return "已取消";
  if (job.status === "done") return `${kinds[job.kind]}完成`;
  return job.status === "queued" ? "等待处理" : job.kind === "parse" ? stages[job.stage] || "正在解析" : `正在${kinds[job.kind]}`;
}
/** Repo-native vector character: no remote assets, animation respects reduced motion. */
function PaperBird({ working }: { working: boolean }) {
  const reduced = useReducedMotion();
  return <motion.svg viewBox="0 0 100 100" className="h-[76px] w-[76px] drop-shadow-sm" aria-hidden="true"
    animate={working && !reduced ? { y: [0, -3, 0], rotate: [0, -2, 0, 2, 0] } : { y: 0, rotate: 0 }}
    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
    <ellipse cx="51" cy="88" rx="25" ry="4" fill="#000" opacity=".07" />
    <path d="M32 74l-3 10m37-10 4 10" stroke="#617369" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 33Q17 59 30 75Q50 87 70 75Q83 58 78 33L69 24H31Z" fill="#f8faf7" stroke="#a9b8ad" strokeWidth="2" />
    <path d="M23 35l8-17 13 12m33 5-8-17-13 12" fill="#dce7d9" stroke="#a9b8ad" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="37" cy="45" r="12" fill="#e9efe6" /><circle cx="63" cy="45" r="12" fill="#e9efe6" />
    <circle cx="38" cy="46" r="4" fill="#34443b" /><circle cx="62" cy="46" r="4" fill="#34443b" />
    <circle cx="39" cy="44" r="1.3" fill="white" /><circle cx="63" cy="44" r="1.3" fill="white" />
    <path d="M46 53l4 5 4-5" fill="#d6a35e" />
    <path d="M25 59l23 5 25-5v18l-25 5-23-5Z" fill="#426554" stroke="#345142" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M48 64v18m-19-19 14 3m10 0 15-3" stroke="#e5ecdf" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 58q-4 11 10 13m52-13q4 11-10 13" stroke="#bacabb" strokeWidth="6" fill="none" strokeLinecap="round" />
  </motion.svg>;
}
interface Props {
  jobs: BackgroundJob[];
  notice: { phase: BrowserImportPhase; title: string; message: string; sourceUrl?: string } | null;
  readingTitle: string | null;
  onDismiss: () => void;
  onOpenPaper: (paperId: string) => void;
}
export function ReadingCompanion({ jobs, notice, readingTitle, onDismiss, onOpenPaper }: Props) {
  const [panel, setPanel] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragControls = useDragControls();
  const dragged = useRef(false);
  const [minimized, setMinimized] = useState(() => localStorage.getItem("zp-companion-minimized") === "true");
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const pending = jobs.filter(active);
  const current = pending.find((job) => job.status === "running" && job.kind === "parse") || pending.find((job) => job.status === "running") || pending[0];
  const busy = pending.length > 0 || notice?.phase === "downloading";
  const count = new Set(pending.map((job) => job.paper_id)).size;
  const title = notice?.phase === "downloading" ? `正在导入 ${notice.title}`
    : current ? `${jobLabel(current)} ${current.title}`
    : notice?.phase === "error" ? `导入失败 ${notice.title}`
    : notice?.phase === "done" ? `已导入 ${notice.title}`
    : readingTitle ? `正在阅读 ${readingTitle}` : "阅读伙伴";
  useEffect(() => {
    if (notice?.phase !== "done") return;
    const timer = setTimeout(onDismiss, 5000); return () => clearTimeout(timer);
  }, [notice, onDismiss]);
  const minimize = () => {
    setMinimized(true); localStorage.setItem("zp-companion-minimized", "true"); onDismiss(); setPanel(false); setHovered(false);
  };
  const restore = () => { setMinimized(false); localStorage.setItem("zp-companion-minimized", "false"); };
  const act = async (operation: () => Promise<void>) => {
    setError(null); try { await operation(); } catch (e) { setError(String(e)); }
  };
  const togglePanel = () => { if (!dragged.current) setPanel(!panel); };
  return <motion.div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="fixed bottom-5 right-5 z-[90] max-w-[calc(100vw-32px)] select-none"
    drag dragControls={dragControls} dragListener={false} onDragStart={() => { dragged.current = true; }} onDragEnd={() => { setTimeout(() => { dragged.current = false; }, 0); }} dragMomentum={false} dragConstraints={{ left: -Math.max(0, window.innerWidth - 400), right: 0, top: -Math.max(0, window.innerHeight - 450), bottom: 0 }}>
    {!minimized && (panel || (hovered && jobs.length > 0)) && <section role="dialog" aria-label="后台任务" className="absolute bottom-full right-0 mb-0 w-[350px] max-w-full rounded-2xl border border-zp-border bg-white p-3 shadow-lg dark:bg-zp-surface" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mb-2 flex items-center justify-between px-1 text-sm font-medium"><span>后台任务{count ? ` · ${count} 篇` : ""}</span><IconTooltip label="收起任务"><button aria-label="收起任务" onClick={() => { setPanel(false); setHovered(false); }} className="rounded-md p-1 hover:bg-zp-subtle"><ChevronDown size={16} /></button></IconTooltip></div>
      {error && <p role="alert" className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="max-h-[320px] overflow-y-auto">
        {jobs.slice(0, limit).map((job) => <div key={job.id} className="rounded-xl px-2 py-2 hover:bg-zp-subtle">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13px]" title={job.title}>{job.title}</p>
              <p className={`mt-0.5 text-xs ${job.status === "failed" ? "text-amber-600" : "text-zp-tertiary"}`}>{jobLabel(job)}{job.completed_pages != null && job.total_pages ? ` · ${job.completed_pages}/${job.total_pages} 页` : ""}</p>
            </div>
            <IconTooltip label="打开论文"><button aria-label={`打开 ${job.title}`} onClick={() => onOpenPaper(job.paper_id)} className="rounded-md p-1.5 hover:bg-zp-border"><BookOpen size={15} /></button></IconTooltip>
            {active(job) && job.status !== "canceling" ? <IconTooltip label="取消任务"><button aria-label={`取消 ${kinds[job.kind]}`} onClick={() => void act(() => cancelJob(job.id))} className="rounded-md p-1.5 hover:bg-zp-border"><X size={15} /></button></IconTooltip>
              : ["failed", "canceled"].includes(job.status) && <IconTooltip label="重试任务"><button aria-label={`重试 ${kinds[job.kind]}`} onClick={() => void act(() => retryJob(job.id))} className="rounded-md p-1.5 hover:bg-zp-border"><RotateCcw size={15} /></button></IconTooltip>}
          </div>
          {job.error && <p className="mt-2 break-words text-xs text-zp-secondary">{job.error}</p>}
        </div>)}
        {jobs.length > limit && <button className="w-full rounded-lg py-2 text-xs text-zp-tertiary hover:bg-zp-subtle" onClick={() => setLimit(limit + 30)}>显示更多</button>}
        {notice?.phase === "error" && <p className="px-2 py-2 text-xs text-amber-700">{notice.message}</p>}
      </div>
    </section>}
    {minimized ? <IconTooltip label={title}><button aria-label="展开阅读伙伴" onClick={restore} className="flex h-10 items-center gap-2 rounded-full border border-zp-border bg-white px-3 shadow-sm dark:bg-zp-surface"><BookOpen size={18} />{busy && <span className="h-2 w-2 rounded-full bg-emerald-500" />}{count > 0 && <span className="text-xs">{count}</span>}</button></IconTooltip>
      : <div className="flex items-end gap-1">
        <div className="max-w-[270px] rounded-2xl border border-zp-border bg-white/95 px-3 py-2 shadow-sm dark:bg-zp-surface">
          <div className="flex items-center gap-2"><button aria-label="查看后台任务" onClick={togglePanel} className="min-w-0 flex-1 text-left text-xs leading-5 line-clamp-2" title={title}>{title}</button><IconTooltip label="收起阅读伙伴"><button aria-label="关闭提示" onClick={minimize} className="rounded-md p-0.5 text-zp-tertiary hover:bg-zp-subtle"><X size={13} /></button></IconTooltip></div>
          {current?.completed_pages != null && !!current.total_pages && <p className="text-xs text-zp-tertiary">{current.completed_pages}/{current.total_pages} 页</p>}
          {notice?.phase === "error" && <p className="mt-1 break-words text-xs text-amber-700">{notice.message}</p>}
          <div className="mt-1.5 flex items-center gap-2"><IconTooltip label="后台任务"><button aria-label="后台任务" onClick={togglePanel} className="flex items-center gap-1 rounded-md p-1 text-zp-tertiary hover:bg-zp-subtle"><ListTodo size={14} />{count > 0 && <span className="text-[10px]">{count}</span>}</button></IconTooltip>{busy && <span className="h-1 w-9 overflow-hidden rounded-full bg-zp-border"><span className="block h-full w-1/2 rounded-full bg-emerald-600 motion-safe:animate-pulse" /></span>}</div>
        </div>
        <button aria-label="阅读伙伴" onPointerDown={(event) => { dragged.current = false; dragControls.start(event, { distanceThreshold: 8 }); }} onClick={togglePanel} className="touch-none cursor-grab active:cursor-grabbing rounded-xl focus-visible:outline-2 focus-visible:outline-emerald-600"><PaperBird working={busy} /></button>
      </div>}
  </motion.div>;
}
