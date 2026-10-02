import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, useReducedMotion } from "motion/react";
import { BookOpen, RotateCcw, X } from "lucide-react";
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
  const dragControls = useDragControls();
  const container = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      const element = container.current;
      if (!element) return;
      setBounds({ left: -Math.max(0, window.innerWidth - element.offsetWidth - 40), right: 0,
        top: 0, bottom: Math.max(0, window.innerHeight - element.offsetHeight - 40) });
    };
    const observer = new ResizeObserver(update);
    if (container.current) observer.observe(container.current);
    window.addEventListener("resize", update); update();
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
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
  const minimize = () => { setMinimized(true); onDismiss(); };
  const act = async (operation: () => Promise<void>) => {
    setError(null); try { await operation(); } catch (e) { setError(String(e)); }
  };
  const visibleJobs = [...pending, ...jobs.filter((job) => ["failed", "canceled"].includes(job.status)).slice(0, 3)];
  return <motion.div ref={container} className="fixed top-5 right-5 z-[90] w-[320px] max-w-[calc(100vw-40px)] select-none"
    drag dragControls={dragControls} dragListener={false} dragMomentum={false} dragConstraints={bounds}>
    <div className="flex flex-col items-center gap-2">
      <div aria-label="阅读伙伴" onPointerDown={(event) => dragControls.start(event, { distanceThreshold: 8 })}
        className="touch-none cursor-grab active:cursor-grabbing"><PaperBird working={busy} /></div>
      {minimized ? <IconTooltip label={title}><button aria-label="展开阅读伙伴" onClick={() => setMinimized(false)} className="flex h-8 items-center gap-2 rounded-full border border-zp-border bg-white px-3 shadow-sm dark:bg-zp-surface"><BookOpen size={16} />{count > 0 && <span className="text-xs">{count}</span>}</button></IconTooltip>
        : <section aria-label="任务气泡" className="w-full rounded-3xl border border-zp-border bg-white/95 px-4 py-3 shadow-sm dark:bg-zp-surface">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[13px] leading-5 break-words" title={title}>{title}</p>
            <IconTooltip label="收起气泡"><button aria-label="关闭提示" onClick={minimize} className="mt-0.5 rounded-md p-0.5 text-zp-tertiary hover:bg-zp-subtle"><X size={13} /></button></IconTooltip>
          </div>
          {notice?.phase === "error" && <p className="mt-1 break-words text-xs text-amber-700">{notice.message}</p>}
          {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
          {visibleJobs.length > 0 && <div className="mt-2 max-h-[180px] space-y-2 overflow-y-auto">
            {visibleJobs.map((job) => <div key={job.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {job.id !== current?.id && <p className="text-xs leading-5 break-words">{job.title}</p>}
                <p className={`text-xs leading-5 ${job.status === "failed" ? "text-amber-600" : "text-zp-tertiary"}`}>{jobLabel(job)}{job.completed_pages != null && job.total_pages ? ` · ${job.completed_pages}/${job.total_pages} 页` : ""}</p>
                {job.error && <p className="break-words text-xs leading-5 text-zp-secondary">{job.error}</p>}
              </div>
              <IconTooltip label="打开论文"><button aria-label={`打开 ${job.title}`} onClick={() => onOpenPaper(job.paper_id)} className="rounded-md p-1 text-zp-tertiary hover:bg-zp-subtle"><BookOpen size={14} /></button></IconTooltip>
              {active(job) && job.status !== "canceling" ? <IconTooltip label="取消任务"><button aria-label={`取消 ${kinds[job.kind]}`} onClick={() => void act(() => cancelJob(job.id))} className="rounded-md p-1 text-zp-tertiary hover:bg-zp-subtle"><X size={14} /></button></IconTooltip>
                : ["failed", "canceled"].includes(job.status) && <IconTooltip label="重试任务"><button aria-label={`重试 ${kinds[job.kind]}`} onClick={() => void act(() => retryJob(job.id))} className="rounded-md p-1 text-zp-tertiary hover:bg-zp-subtle"><RotateCcw size={14} /></button></IconTooltip>}
            </div>)}
          </div>}
        </section>}
    </div>
  </motion.div>;
}
