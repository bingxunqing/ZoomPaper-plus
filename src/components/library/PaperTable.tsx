import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useState } from "react";
import { Check, FileCheck2, FileClock, FileQuestion, MoreHorizontal, Star } from "lucide-react";
import { cn, displayPaperTitle, formatTime } from "@/lib/utils";
import { folderColor } from "@/lib/folderColors";
import type { Folder, Paper, ReadingPlan, ReadingStatus } from "@/lib/api";
import { PaperMenuItems, type PaperMenuActions } from "./paperMenu";
import { PlanSubmenu, type PlanMenuPrimitives } from "./planMenu";

export interface PaperTableProps {
  papers: Paper[];
  folders: Folder[];
  plans: ReadingPlan[];
  selectedIds: ReadonlySet<string>;
  focusedId: string | null;
  currentFolderId: string | null;
  parsingId: string | null;
  onFocus: (paper: Paper) => void;
  onToggle: (paperId: string) => void;
  onOpen: (paperId: string) => void;
  onRename: (paper: Paper) => void;
  onPickFolder: (paper: Paper) => void;
  onSetStatus: (paper: Paper, status: ReadingStatus) => void;
  onPlanQuickAdd: (paper: Paper, planId: string | null, dueTs: number | null) => void;
  onPlanRemove: (paper: Paper, planId: string) => void;
  onPlanCustomDate: (paper: Paper, planId: string | null) => void;
  onToggleStar: (paper: Paper) => void;
  onParse: (paperId: string) => void;
  onDelete: (paper: Paper) => void;
  onRemoveFromCurrentFolder: (paper: Paper) => void;
}

const statusDot: Record<string, string> = {
  unread: "bg-zp-primary",
  reading: "bg-amber-500",
  read: "border border-zp-border bg-transparent",
};

function ParseIcon({ status, parsing }: { status: string; parsing: boolean }) {
  const cls = "h-4 w-4";
  if (parsing || status === "parsing") return <FileClock className={cn(cls, "animate-pulse text-amber-600")} />;
  if (status === "ready") return <FileCheck2 className={cn(cls, "text-emerald-600")} />;
  return <FileQuestion className={cn(cls, status === "failed" ? "text-red-500" : "text-zp-tertiary")} />;
}

export function PaperTable(props: PaperTableProps) {
  const folderById = new Map(props.folders.map((folder) => [folder.id, folder]));
  const [targetPlans, setTargetPlans] = useState<Record<string, string>>({});

  return (
    <div className="min-w-[760px] text-[13px]">
      <div className="grid h-9 grid-cols-[36px_minmax(280px,1fr)_minmax(140px,0.55fr)_120px_118px_38px] items-center border-b border-zp-border px-2 text-xs text-zp-quaternary">
        <span />
        <span>标题</span>
        <span>作者</span>
        <span>文件夹</span>
        <span>最后阅读</span>
        <span />
      </div>
      <div>
        {props.papers.map((paper) => {
          const selected = props.selectedIds.has(paper.id);
          const focused = props.focusedId === paper.id;
          const paperFolders = paper.folder_ids.map((id) => folderById.get(id)).filter((f): f is Folder => Boolean(f));
          const containingPlan = props.plans.find((p) => p.type === "papers" && p.items.some((item) => item.paper_id === paper.id)) ?? null;
          const activePlans = props.plans.filter((p) => p.type === "papers" && p.active);
          const effectivePlan = containingPlan ?? activePlans.find((plan) => plan.id === targetPlans[paper.id]) ?? activePlans[0] ?? null;
          const actions: PaperMenuActions = {
            onOpen: () => props.onOpen(paper.id),
            onRename: () => props.onRename(paper),
            onPickFolder: () => props.onPickFolder(paper),
            onRemoveFromCurrentFolder: props.currentFolderId ? () => props.onRemoveFromCurrentFolder(paper) : undefined,
            onSetStatus: (status) => props.onSetStatus(paper, status),
            currentStatus: paper.reading_status as ReadingStatus,
            onDelete: () => props.onDelete(paper),
          };

          return (
            <div
              key={paper.id}
              role="row"
              tabIndex={0}
              aria-selected={focused}
              onClick={() => props.onFocus(paper)}
              onDoubleClick={() => props.onOpen(paper.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") props.onOpen(paper.id);
                if (event.key === " " && !event.repeat) {
                  event.preventDefault();
                  props.onToggle(paper.id);
                }
              }}
              className={cn(
                "group grid min-h-11 cursor-default grid-cols-[36px_minmax(280px,1fr)_minmax(140px,0.55fr)_120px_118px_38px] items-center border-b border-zp-border/70 px-2 outline-none transition-colors",
                focused ? "bg-[#eceeeb] dark:bg-zp-surface-active" : "hover:bg-zp-surface-hover",
              )}
            >
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label={selected ? "取消选择" : "选择论文"}
                  onClick={(event) => { event.stopPropagation(); props.onToggle(paper.id); }}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors",
                    selected ? "border-zp-primary bg-zp-primary text-white" : "border-zp-border bg-white dark:bg-zp-surface",
                  )}
                >
                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
              </div>

              <div className="flex min-w-0 items-center gap-2 pr-4">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot[paper.reading_status] ?? statusDot.unread)} />
                <ParseIcon status={paper.parse_status} parsing={props.parsingId === paper.id} />
                <span className="truncate font-medium text-zp-primary">{displayPaperTitle(paper.title)}</span>
                {paper.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
              </div>
              <span className="truncate pr-4 text-zp-secondary">{paper.authors || "—"}</span>
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                {paperFolders.length === 0 ? <span className="text-zp-tertiary">—</span> : paperFolders.slice(0, 2).map((folder) => (
                  <span key={folder.id} title={folder.name} className="flex min-w-0 items-center gap-1 text-xs text-zp-secondary">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: folderColor(folder.color).swatch }} />
                    <span className="truncate">{folder.name}</span>
                  </span>
                ))}
              </div>
              <span className="truncate text-xs text-zp-quaternary">{paper.last_read_at ? formatTime(paper.last_read_at) : "—"}</span>
              <MenuPrimitive.Root>
                <MenuPrimitive.Trigger render={<button type="button" aria-label="更多操作" title="更多操作" onClick={(event) => event.stopPropagation()} className="flex h-7 w-7 items-center justify-center rounded-md text-zp-quaternary opacity-0 hover:bg-white hover:text-zp-primary group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-zp-surface"><MoreHorizontal className="h-4 w-4" /></button>} />
                <MenuPrimitive.Portal>
                  <MenuPrimitive.Positioner align="end" sideOffset={4} className="isolate z-50">
                    <MenuPrimitive.Popup className="z-50 min-w-44 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
                      <PaperMenuItems
                        Item={MenuPrimitive.Item}
                        actions={actions}
                        planMenuSlot={<PlanSubmenu
                          P={MenuPrimitive as unknown as PlanMenuPrimitives}
                          activePlans={activePlans}
                          containingPlan={containingPlan}
                          currentDue={containingPlan?.items.find((item) => item.paper_id === paper.id)?.due_date ?? null}
                          targetPlanId={effectivePlan?.id ?? null}
                          onSelectTarget={(planId) => setTargetPlans((current) => ({ ...current, [paper.id]: planId }))}
                          onQuickDate={(due) => props.onPlanQuickAdd(paper, effectivePlan?.id ?? null, due)}
                          onCustomDate={() => props.onPlanCustomDate(paper, effectivePlan?.id ?? null)}
                          onRemove={containingPlan ? () => props.onPlanRemove(paper, containingPlan.id) : null}
                        />}
                      />
                    </MenuPrimitive.Popup>
                  </MenuPrimitive.Positioner>
                </MenuPrimitive.Portal>
              </MenuPrimitive.Root>
            </div>
          );
        })}
      </div>
    </div>
  );
}
