import { BookOpen, FolderInput, Sparkles, Star, X } from "lucide-react";
import type { Folder, Paper } from "@/lib/api";
import { cn, displayPaperTitle, formatDuration, formatTime } from "@/lib/utils";

interface Props {
  paper: Paper;
  folders: Folder[];
  onClose: () => void;
  onOpen: () => void;
  onToggleStar: () => void;
  onPickFolder: () => void;
  onParse: () => void;
}

export function PaperInspector({ paper, folders, onClose, onOpen, onToggleStar, onPickFolder, onParse }: Props) {
  const names = paper.folder_ids.map((id) => folders.find((folder) => folder.id === id)?.name).filter(Boolean);
  return (
    <aside className="flex w-[286px] shrink-0 flex-col border-l border-zp-border bg-[#fbfbfa] dark:bg-[#191919]">
      <div className="flex h-12 items-center justify-between px-4">
        <span className="text-xs font-medium text-zp-quaternary">论文信息</span>
        <button type="button" aria-label="关闭详情" title="关闭详情" onClick={onClose} className="rounded-md p-1 text-zp-quaternary hover:bg-zp-surface-hover hover:text-zp-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
        <h2 className="text-[15px] leading-6 font-semibold text-zp-primary">{displayPaperTitle(paper.title)}</h2>
        {paper.authors && <p className="mt-2 text-xs leading-5 text-zp-secondary">{paper.authors}</p>}

        <div className="mt-4 flex items-center gap-1">
          <button type="button" onClick={onOpen} title="打开论文" className="flex h-8 w-8 items-center justify-center rounded-md bg-zp-primary text-white"><BookOpen className="h-4 w-4" /></button>
          <button type="button" onClick={onToggleStar} title={paper.starred ? "取消星标" : "添加星标"} className={cn("flex h-8 w-8 items-center justify-center rounded-md hover:bg-zp-surface-hover", paper.starred ? "text-amber-500" : "text-zp-quaternary")}><Star className={cn("h-4 w-4", paper.starred && "fill-current")} /></button>
          <button type="button" onClick={onPickFolder} title="加入文件夹" className="flex h-8 w-8 items-center justify-center rounded-md text-zp-quaternary hover:bg-zp-surface-hover hover:text-zp-primary"><FolderInput className="h-4 w-4" /></button>
          <button type="button" onClick={onParse} title="解析论文" className="flex h-8 w-8 items-center justify-center rounded-md text-zp-quaternary hover:bg-zp-surface-hover hover:text-zp-primary"><Sparkles className="h-4 w-4" /></button>
        </div>

        <dl className="mt-5 grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-xs">
          <dt className="text-zp-quaternary">状态</dt><dd className="text-zp-secondary">{{ unread: "未读", reading: "在读", read: "已读" }[paper.reading_status] ?? "未读"}</dd>
          <dt className="text-zp-quaternary">解析</dt><dd className="text-zp-secondary">{{ ready: "已解析", parsing: "解析中", failed: "解析失败", unparsed: "未解析" }[paper.parse_status] ?? "未解析"}</dd>
          <dt className="text-zp-quaternary">阅读时长</dt><dd className="text-zp-secondary">{formatDuration(paper.total_read_seconds)}</dd>
          <dt className="text-zp-quaternary">最后阅读</dt><dd className="text-zp-secondary">{paper.last_read_at ? formatTime(paper.last_read_at) : "—"}</dd>
          <dt className="text-zp-quaternary">文件夹</dt><dd className="text-zp-secondary">{names.join("、") || "未分类"}</dd>
        </dl>

        {paper.abstract && <div className="mt-6"><h3 className="mb-2 text-xs font-medium text-zp-primary">摘要</h3><p className="text-xs leading-5 text-zp-secondary">{paper.abstract}</p></div>}
      </div>
    </aside>
  );
}
