import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PaperMenuItems, type PaperMenuActions } from "@/components/library/paperMenu";

afterEach(cleanup);

const Item = ({ onClick, children }: { onClick?: () => void; children?: React.ReactNode }) => (
  <button type="button" onClick={onClick}>{children}</button>
);

function actions(): PaperMenuActions {
  return {
    onOpen: vi.fn(),
    onRename: vi.fn(),
    onPickFolder: vi.fn(),
    onSetStatus: vi.fn(),
    currentStatus: "unread",
    onDelete: vi.fn(),
  };
}

it("hides single-paper actions while multiple papers are selected", () => {
  render(<PaperMenuItems Item={Item} actions={actions()} selectionMode planMenuSlot={<button>阅读计划</button>} />);
  expect(screen.queryByText("打开")).toBeNull();
  expect(screen.queryByText("重命名")).toBeNull();
  expect(screen.queryByText("阅读计划")).toBeNull();
  expect(screen.getByText("添加到文件夹…")).toBeTruthy();
});

it("keeps reading status available as a batch action", () => {
  const menuActions = actions();
  render(<PaperMenuItems Item={Item} actions={menuActions} selectionMode />);
  fireEvent.click(screen.getByText("标记为已读"));
  expect(menuActions.onSetStatus).toHaveBeenCalledWith("read");
});
