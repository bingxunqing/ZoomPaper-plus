import { useCallback, useEffect, useRef } from "react";

/**
 * 在多选模式中按住复选框拖过论文行/卡片，连续应用起点的目标状态。
 * 从未选项开始为批量选择；从已选项开始为批量取消。
 */
export function useDragPaperSelection(
  setSelected: (id: string, selected: boolean) => void,
  paperIds: string[] = [],
) {
  const idsRef = useRef(paperIds); idsRef.current = paperIds;
  const dragRef = useRef<{ active: boolean; selected: boolean; last: string; ids: string[] } | null>(null);
  const suppressClickUntilRef = useRef(0);

  const stop = useCallback(() => {
    if (dragRef.current?.active) suppressClickUntilRef.current = Date.now() + 400;
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
    };
  }, [stop]);

  const start = useCallback((id: string, currentlySelected: boolean) => {
    const selected = !currentlySelected;
    suppressClickUntilRef.current = Number.POSITIVE_INFINITY;
    dragRef.current = { active: true, selected, last: id, ids: [...idsRef.current] };
    setSelected(id, selected);
  }, [setSelected]);

  const enter = useCallback((id: string) => {
    const drag = dragRef.current;
    if (drag?.active) {
      if(id===drag.last)return;
      const ids=drag.ids; const from=ids.indexOf(drag.last), to=ids.indexOf(id);
      if(from>=0 && to>=0) for(let i=Math.min(from,to);i<=Math.max(from,to);i++) setSelected(ids[i],drag.selected);
      else setSelected(id,drag.selected);
      drag.last=id;
    }
  }, [setSelected]);

  useEffect(() => {
    let frame=0; let point:{x:number;y:number}|null=null;
    const tick=()=>{
      frame=0;
      if(!dragRef.current?.active || !point) return;
      const target=document.elementFromPoint?.(point.x,point.y) as HTMLElement|null;
      const row=target?.closest<HTMLElement>('[data-paper-id]');
      if(row?.dataset.paperId) enter(row.dataset.paperId);
      let box:HTMLElement|null=target;
      while(box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box=box.parentElement;
      if(box){const rect=box.getBoundingClientRect(); if(point.y<rect.top+32) box.scrollTop-=12; else if(point.y>rect.bottom-32) box.scrollTop+=12;}
      frame=requestAnimationFrame(tick);
    };
    const move=(event:PointerEvent)=>{if(!dragRef.current?.active)return;point={x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(()=>{frame=0;tick();});};
    window.addEventListener('pointermove',move);
    return()=>{window.removeEventListener('pointermove',move);cancelAnimationFrame(frame);};
  },[enter]);

  const shouldSuppressClick = useCallback(
    () => dragRef.current?.active === true || Date.now() < suppressClickUntilRef.current,
    [],
  );

  return { start, enter, stop, shouldSuppressClick };
}
