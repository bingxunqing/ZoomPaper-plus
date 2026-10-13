import { Children, type ReactNode } from "react";
import { useVirtualRows } from '@/hooks/useVirtualRows';
export function PaperGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const window = useVirtualRows(items.length, 156, true);
  return <div ref={window.ref} style={{paddingTop: window.top, paddingBottom: window.bottom}}>
    <div className="grid auto-rows-[140px] gap-4" style={{gridTemplateColumns:`repeat(${window.columns}, minmax(0,1fr))`}}>{items.slice(window.start, window.end)}</div>
  </div>;
}
