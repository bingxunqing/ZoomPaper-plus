import { useLayoutEffect, useRef, useState } from 'react';

/** Window rows in the existing library scrollbox; no nested scrollbar. */
export function useVirtualRows(count: number, height: number, grid = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [window, setWindow] = useState({ start: 0, end: 30, columns: 1 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let parent: HTMLElement | null = element.parentElement;
    while (parent && !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) parent = parent.parentElement;
    if (!parent) return;
    const scrollbox = parent;
    const update = () => {
      const columns = grid ? Math.max(1, Math.floor((element.clientWidth + 16) / 316)) : 1;
      const top = Math.max(0, scrollbox.getBoundingClientRect().top - element.getBoundingClientRect().top);
      const start = Math.max(0, Math.floor(top / height) - 8);
      const end = Math.min(Math.ceil(count / columns), Math.ceil((top + scrollbox.clientHeight) / height) + 8);
      setWindow(previous => previous.start === start && previous.end === end && previous.columns === columns ? previous : { start, end, columns });
    };
    update();
    scrollbox.addEventListener('scroll', update, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(scrollbox); resize?.observe(element);
    return () => { scrollbox.removeEventListener('scroll', update); resize?.disconnect(); };
  }, [count, height, grid]);
  const total = Math.ceil(count / window.columns);
  const start = Math.min(window.start, total);
  const end = Math.min(Math.max(start, window.end), total);
  return { ref, start: start * window.columns, end: end * window.columns,
    top: start * height, bottom: Math.max(0, total - end) * height, columns: window.columns };
}
