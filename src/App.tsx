import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { Library } from "@/pages/Library";
import { Reader } from "@/pages/Reader";
import { SettingsPage } from "@/pages/Settings";
import { SearchPage } from "@/pages/SearchPage";
import { AskPage } from "@/pages/AskPage";
import { TimelinePage } from "@/pages/TimelinePage";
import { HelpPage } from "@/pages/HelpPage";
import { NavRail, type NavItem } from "@/components/NavRail";
import { type BrowserImportPhase } from "@/components/BrowserImportNotice";
import { importBrowserDownload, importPdfUrl, listJobs, type BackgroundJob } from "@/lib/api";
import { CompanionBridge } from "@/components/CompanionWindow";

type View =
  | { name: "library" }
  | { name: "timeline" }
  | { name: "search" }
  | { name: "ask" }
  | { name: "reader"; paperId: string; pageIdx?: number }
  | { name: "settings" }
  | { name: "help" };

function App() {
  const [view, setView] = useState<View>({ name: "library" });
  const [libraryRefreshSignal, setLibraryRefreshSignal] = useState(0);
  const [browserImport, setBrowserImport] = useState<{
    phase: BrowserImportPhase;
    title: string;
    message: string;
    sourceUrl?: string;
  } | null>(null);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [readingTitle, setReadingTitle] = useState("");
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>; let previous = ""; let revision = "";
    const poll = async () => {
      try {
        const next = await listJobs();
        if (stopped) return;
        const signature = JSON.stringify(next);
        if (signature !== previous) {
          const nextRevision = next.map((job) => `${job.id}:${job.status}`).join("|");
          if (revision && revision !== nextRevision) setLibraryRefreshSignal((value) => value + 1);
          revision = nextRevision;
          previous = signature; setJobs(next);
        }
      } catch { /* Window startup/reload: the next poll reconnects. */ }
      if (!stopped) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);
  const handledLinks = useRef(new Set<string>());


  useEffect(() => {
    const preventNativeMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", preventNativeMenu);
    return () => document.removeEventListener("contextmenu", preventNativeMenu);
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const handleLinks = (links: string[]) => {
      for (const rawLink of links) {
        let link: URL;
        try {
          link = new URL(rawLink);
        } catch {
          continue;
        }
        if (link.protocol !== "zoompaper-plus:" || link.hostname !== "import") continue;
        const pdfUrl = link.searchParams.get("pdf");
        const localFile = link.searchParams.get("file");
        if (!pdfUrl && !localFile) continue;
        const title = link.searchParams.get("title")?.trim() || "浏览器中的论文";
        const sourceUrl = link.searchParams.get("source");
        const githubUrl = link.searchParams.get("github");
        const venue = link.searchParams.get("venue");
        const sourceIconUrl = link.searchParams.get("icon");
        const doi = link.searchParams.get("doi");
        const requestId = link.searchParams.get("request") || rawLink;
        if (handledLinks.current.has(requestId)) continue;
        handledLinks.current.add(requestId);

        void (async () => {
          if (disposed) return;
          setBrowserImport({ phase: "downloading", title, message: "正在安全下载 PDF…" });
          try {
            const paper = localFile
              ? await importBrowserDownload(localFile, title, sourceUrl, githubUrl, venue, sourceIconUrl, doi, requestId)
              : await importPdfUrl(pdfUrl!, title, sourceUrl, githubUrl, venue, sourceIconUrl, doi, requestId);
            if (disposed) return;
            setLibraryRefreshSignal((value) => value + 1);
            setBrowserImport({ phase: "done", title: paper.title, message: "" });
          } catch (error) {
            if (disposed) return;
            handledLinks.current.delete(requestId);
            setBrowserImport({ phase: "error", title, message: String(error), sourceUrl: sourceUrl?.startsWith("https://") ? sourceUrl : undefined });
          }
        })();
      }
    };

    void getCurrent().then((links) => links && handleLinks(links));
    void onOpenUrl(handleLinks).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const openPaper = (paperId: string, pageIdx?: number) =>
    setView({ name: "reader", paperId, pageIdx });
  // 阅读页归属「论文库」导航高亮
  const activeNav: NavItem = view.name === "reader" ? "library" : view.name;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 56px 图标导航（全局） */}
      <NavRail
        active={activeNav}
        onSelect={(name) => setView({ name } as View)}
      />

      {view.name === "library" ? (
        /* 论文库工作台：文件夹侧栏 + 内容区由 Library 自行组织 */
        <Library onOpenPaper={openPaper} refreshSignal={libraryRefreshSignal} jobs={jobs} />
      ) : (
        /* 其余页面：主内容区自行控制滚动 */
        <main className={`flex min-h-0 min-w-0 flex-1 flex-col ${view.name === "ask" ? "bg-white dark:bg-[#191919]" : "p-6"}`}>
          <motion.div
            key={view.name + ("paperId" in view ? view.paperId : "")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
          >
            {view.name === "search" && <SearchPage onOpenPaper={openPaper} />}
            {view.name === "timeline" && <TimelinePage onOpenPaper={openPaper} />}
            {view.name === "ask" && <AskPage onOpenPaper={openPaper} />}
            {view.name === "reader" && (
              <Reader
                paperId={view.paperId}
                refreshSignal={libraryRefreshSignal}
                onTitleChange={setReadingTitle}
                initialPageIdx={view.pageIdx}
                onBack={() => setView({ name: "library" })}
              />
            )}
            {view.name === "settings" && <SettingsPage />}
            {view.name === "help" && <HelpPage />}
          </motion.div>
        </main>
      )}
      <CompanionBridge jobs={jobs} notice={browserImport} readingTitle={view.name === "reader" ? readingTitle : null}
        onDismiss={() => setBrowserImport(null)} onOpenPaper={openPaper} />
    </div>
  );
}

export default App;
