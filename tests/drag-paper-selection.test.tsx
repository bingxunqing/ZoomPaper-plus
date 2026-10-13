import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDragPaperSelection } from "@/hooks/useDragPaperSelection";

function Harness({ onSet, onBlank }: { onSet: (id: string, selected: boolean) => void; onBlank?: () => void }) {
  const drag = useDragPaperSelection(onSet);
  return <>
    <button onPointerDown={() => drag.start("paper-1", false)}>Start selecting</button>
    <div role="row" onPointerEnter={() => drag.enter("paper-2")}>Second</div>
    <div role="row" onPointerEnter={() => drag.enter("paper-3")}>Third</div>
    <button onClick={() => { if (!drag.shouldSuppressClick()) onBlank?.(); }}>Blank area</button>
  </>;
}

afterEach(cleanup);

it("applies one selection state across entered papers and stops on pointer up", () => {
  const onSet = vi.fn();
  render(<Harness onSet={onSet} />);

  fireEvent.pointerDown(screen.getByRole("button", { name: "Start selecting" }));
  fireEvent.pointerEnter(screen.getAllByRole("row")[0]);
  fireEvent.pointerUp(window);
  fireEvent.pointerEnter(screen.getAllByRole("row")[1]);

  expect(onSet.mock.calls).toEqual([
    ["paper-1", true],
    ["paper-2", true],
  ]);
});

it("suppresses the release click after a checkbox drag", () => {
  const onBlank = vi.fn();
  render(<Harness onSet={vi.fn()} onBlank={onBlank} />);

  fireEvent.pointerDown(screen.getByRole("button", { name: "Start selecting" }));
  fireEvent.pointerEnter(screen.getAllByRole("row")[0]);
  fireEvent.pointerUp(window);
  fireEvent.click(screen.getByRole("button", { name: "Blank area" }));

  expect(onBlank).not.toHaveBeenCalled();
});

function RangeHarness({onSet}:{onSet:(id:string,selected:boolean)=>void}){
 const drag=useDragPaperSelection(onSet,['a','b','c','d']);return <><button onPointerDown={()=>drag.start('a',false)}>Range start</button><button onPointerEnter={()=>drag.enter('d')}>Range end</button></>;
}
it('selects skipped rows when fast dragging across a virtual window',()=>{
 const onSet=vi.fn();render(<RangeHarness onSet={onSet}/>);fireEvent.pointerDown(screen.getByText('Range start'));fireEvent.pointerEnter(screen.getByText('Range end'));expect(new Set(onSet.mock.calls.map(c=>c[0]))).toEqual(new Set(['a','b','c','d']));fireEvent.pointerUp(window);
});
