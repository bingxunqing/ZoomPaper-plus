import { useEffect, useRef, useState } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { listJobs, type BackgroundJob } from "@/lib/api";
import { ReadingCompanion } from "./ReadingCompanion";
import type { BrowserImportPhase } from "./BrowserImportNotice";

interface Snapshot {
  jobs: BackgroundJob[];
  notice: { phase: BrowserImportPhase; title: string; message: string } | null;
  readingTitle: string | null;
}
const initial: Snapshot = { jobs: [], notice: null, readingTitle: null };
export function CompanionBridge(props: Snapshot & { onDismiss: () => void; onOpenPaper: (id: string) => void }) {
  const latest = useRef(props); latest.current = props;
  useEffect(() => {
    const send = () => emitTo("companion", "companion:state", {
      jobs: latest.current.jobs, notice: latest.current.notice, readingTitle: latest.current.readingTitle,
    });
    const handlers = [
      listen("companion:ready", () => { void send(); }),
      listen("companion:dismiss", () => latest.current.onDismiss()),
      listen<string>("companion:open", async ({ payload }) => {
        latest.current.onOpenPaper(payload);
        const window = getCurrentWindow();
        await window.show(); await window.unminimize(); await window.setFocus();
      }),
    ];
    return () => { for (const handler of handlers) void handler.then((unlisten) => unlisten()); };
  }, []);
  useEffect(() => { void emitTo("companion", "companion:state", { jobs: props.jobs, notice: props.notice, readingTitle: props.readingTitle }); }, [props.jobs, props.notice, props.readingTitle]);
  return null;
}
export function CompanionWindow() {
  const [state, setState] = useState(initial);
  const contents = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.classList.add("companion-window");
    const window = getCurrentWindow();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const subscription = listen<Snapshot>("companion:state", ({ payload }) => { if (!stopped) setState(payload); });
    void subscription.then(() => emitTo("main", "companion:ready"));
    // Task progress remains available even when the main webview is hidden.
    const poll = async () => {
      try { const jobs = await listJobs(); if (!stopped) setState((prev) => ({ ...prev, jobs })); } catch { /* Reconnect next poll. */ }
      if (!stopped) timer = setTimeout(poll, 1500);
    };
    void poll();
    let previousHeight = 0;
    const resize = new ResizeObserver(() => {
      const height = Math.ceil(contents.current?.getBoundingClientRect().height || 100);
      if (height !== previousHeight) { previousHeight = height; void window.setSize(new LogicalSize(340, height)); }
    });
    if (contents.current) resize.observe(contents.current);
    void window.show();
    return () => { stopped = true; clearTimeout(timer); resize.disconnect(); void subscription.then((unlisten) => unlisten()); };
  }, []);
  return <div ref={contents} className="w-[340px] p-[10px]">
    <ReadingCompanion {...state} onNativeDrag={() => { void getCurrentWindow().startDragging(); }}
      onDismiss={() => { setState((prev) => ({ ...prev, notice: null })); void emitTo("main", "companion:dismiss"); }}
      onOpenPaper={(id) => { void emitTo("main", "companion:open", id); }} />
  </div>;
}
