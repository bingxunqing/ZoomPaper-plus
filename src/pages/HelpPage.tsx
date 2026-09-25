import { useState } from "react";
import { ArrowUp, BookOpen, Bot, FolderTree, Loader2, MousePointer2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askAppHelp } from "@/lib/api";

const sections = [
  { icon: FolderTree, title: "论文库", items: ["收藏与文件夹互不冲突", "长按进入多选，拖动连续选择", "删除后可在回收站恢复"] },
  { icon: BookOpen, title: "阅读", items: ["PDF、译文与博客同屏切换", "划词翻译与批注", "引用可跳回原文"] },
  { icon: Sparkles, title: "AI", items: ["论文问答与跨库检索", "快速与深度模式", "费曼学习、博客与测验"] },
  { icon: MousePointer2, title: "快捷操作", items: ["悬停图标查看用途", "右键论文打开操作菜单", "点击空白处退出多选"] },
];

export function HelpPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const value = question.trim();
    if (!value || loading) return;
    setLoading(true); setError(null);
    try { setAnswer(await askAppHelp(value)); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <section className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto px-8 py-7">
      <header><h1 className="text-xl font-semibold text-zp-primary">帮助</h1></header>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {sections.map(({ icon: Icon, title, items }) => <article key={title} className="rounded-xl border border-zp-border bg-white p-4 dark:bg-zp-surface"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-zp-tertiary" /><h2 className="text-sm font-medium">{title}</h2></div><ul className="mt-3 space-y-1.5 text-[13px] text-zp-secondary">{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
      </div>
      <div className="mt-6 rounded-xl border border-zp-border bg-white p-4 dark:bg-zp-surface">
        <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-zp-tertiary" /><h2 className="text-sm font-medium">问 AI</h2></div>
        {answer && <div className="prose prose-sm mt-4 max-w-none text-zp-secondary dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown></div>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center rounded-xl border border-zp-border bg-zp-surface px-3 py-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) void ask(); }} aria-label="询问软件功能" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <button type="button" onClick={() => void ask()} disabled={!question.trim() || loading} aria-label="发送" className="flex h-8 w-8 items-center justify-center rounded-full bg-zp-primary text-white disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button>
        </div>
      </div>
    </section>
  );
}
