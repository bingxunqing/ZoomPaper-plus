import { useEffect, useRef, useState } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize, PhysicalPosition, currentMonitor } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { companionEnabled, setCompanionEnabled } from "@/lib/companionPreferences";
import { listJobs, type BackgroundJob } from "@/lib/api";
import { ReadingCompanion } from "./ReadingCompanion";
import type { BrowserImportPhase } from "./BrowserImportNotice";

interface Snapshot {
  jobs: BackgroundJob[];
  notice: { phase: BrowserImportPhase; title: string; message: string } | null;
  readingTitle: string | null;
}
const initial: Snapshot = { jobs: [], notice: null, readingTitle: null };
export function CompanionBridge(props: Snapshot & { onDismiss: () => void; onOpenPaper: (id: string) => void; onImport: () => void; onContinue: () => void }) {
  const latest = useRef(props); latest.current = props;
  useEffect(() => {
    const send = () => emitTo("companion", "companion:state", {
      jobs: latest.current.jobs, notice: latest.current.notice, readingTitle: latest.current.readingTitle,
    });
    const focusMain = async () => { const window = getCurrentWindow(); await window.show(); await window.unminimize(); await window.setFocus(); };
    const preference = () => { void emitTo("companion", "companion:visibility", companionEnabled()); };
    window.addEventListener("companion-preference", preference);
    const handlers = [
      listen("companion:hide", () => { setCompanionEnabled(false); preference(); }),
      listen("companion:import", async () => { await focusMain(); latest.current.onImport(); }),
      listen("companion:continue", async () => { await focusMain(); latest.current.onContinue(); }),
      listen("companion:ready", () => { void send(); preference(); }),
      listen("companion:dismiss", () => latest.current.onDismiss()),
      listen<string>("companion:open", async ({ payload }) => {
        latest.current.onOpenPaper(payload);
        const window = getCurrentWindow();
        await window.show(); await window.unminimize(); await window.setFocus();
      }),
    ];
    return () => { window.removeEventListener("companion-preference", preference); for (const handler of handlers) void handler.then((unlisten) => unlisten()); };
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
    let enabled = companionEnabled();
    const visibility = listen<boolean>("companion:visibility", ({ payload }) => { enabled = payload; void (payload ? window.show() : window.hide()); });
    const subscription = listen<Snapshot>("companion:state", ({ payload }) => { if (!stopped) setState(payload); });
    void subscription.then(() => emitTo("main", "companion:ready"));
    // Task progress remains available even when the main webview is hidden.
    const poll = async () => {
      try { const jobs = await listJobs(); if (!stopped) setState((prev) => ({ ...prev, jobs })); } catch { /* Reconnect next poll. */ }
      if (!stopped) timer = setTimeout(poll, 1500);
    };
    void poll();
    let previousHeight = 0;
    let resizing = Promise.resolve();
    const measure = () => {
      if (!contents.current) return;
      const regions = [...contents.current.querySelectorAll<HTMLElement>('[data-companion-hit]')].map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, ellipse: element.dataset.companionHit === 'ellipse' };
      });
      void invoke('companion_regions', { regions }).catch(() => {});
      const height = Math.ceil(contents.current.getBoundingClientRect().height || 100);
      if (height === previousHeight) return;
      previousHeight = height;
      resizing = resizing.then(async () => {
        if (stopped) return;
        await window.setSize(new LogicalSize(340, height));
        const [monitor, position, scale] = await Promise.all([currentMonitor(), window.outerPosition(), window.scaleFactor()]);
        if (monitor) {
          const area = monitor.workArea;
          const x = Math.max(area.position.x, Math.min(position.x, area.position.x + area.size.width - 340 * scale));
          const y = Math.max(area.position.y, Math.min(position.y, area.position.y + area.size.height - height * scale));
          if (x !== position.x || y !== position.y) await window.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)));
        }
      }).catch(() => {});
    };
    const resize = new ResizeObserver(measure);
    const mutation = new MutationObserver(measure);
    if (contents.current) { resize.observe(contents.current); mutation.observe(contents.current, { childList: true, subtree: true }); }
    measure();
    if (enabled) void window.show();
    return () => { stopped = true; clearTimeout(timer); resize.disconnect(); mutation.disconnect(); void visibility.then(unlisten => unlisten()); void subscription.then((unlisten) => unlisten()); };
  }, []);
  return <div ref={contents} className="w-[340px] p-[10px]">
    <ReadingCompanion {...state} onHide={() => { void getCurrentWindow().hide(); void emitTo("main", "companion:hide"); }}
      onImport={() => { void emitTo("main", "companion:import"); }} onContinue={() => { void emitTo("main", "companion:continue"); }} onNativeDrag={() => { void getCurrentWindow().startDragging(); }}
      onDismiss={() => { setState((prev) => ({ ...prev, notice: null })); void emitTo("main", "companion:dismiss"); }}
      onOpenPaper={(id) => { void emitTo("main", "companion:open", id); }} />
  </div>;
}
