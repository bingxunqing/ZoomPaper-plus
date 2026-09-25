import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDragPaperSelection } from "@/hooks/useDragPaperSelection";

function Harness({ onSet }: { onSet: (id: string, selected: boolean) => void }) {
  const drag = useDragPaperSelection(onSet);
  return <>
    <button onPointerDown={() => drag.start("paper-1", false)}>Start selecting</button>
    <div role="row" onPointerEnter={() => drag.enter("paper-2")}>Second</div>
    <div role="row" onPointerEnter={() => drag.enter("paper-3")}>Third</div>
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
