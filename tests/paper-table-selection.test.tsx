import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PaperTable, type PaperTableProps } from "@/components/library/PaperTable";
import type { Paper } from "@/lib/api";

afterEach(() => { cleanup(); vi.useRealTimers(); });

const paper: Paper = {
  id: "paper-1", title: "Test Paper", authors: null, abstract: null,
  pdf_path: "/p.pdf", md_path: "/p.md", blog_md_path: null,
  created_at: 1, last_read_at: null, reading_status: "unread",
  parse_status: "ready", starred: false, finished_at: null,
  source_url: null, github_url: null, venue: null,
  total_read_seconds: 0, folder_ids: [],
};

const props: PaperTableProps = {
  papers: [paper], folders: [], plans: [], selectedIds: new Set(),
  selectionMode: false, onLongPress: vi.fn(), focusedId: null,
  currentFolderId: null, parsingId: null, onFocus: vi.fn(),
  onToggle: vi.fn(), onSelectionDragStart: vi.fn(), onSelectionDragEnter: vi.fn(),
  onOpen: vi.fn(), onRename: vi.fn(),
  onPickFolder: vi.fn(), onSetStatus: vi.fn(), onPlanQuickAdd: vi.fn(),
  onPlanRemove: vi.fn(), onPlanCustomDate: vi.fn(), onToggleStar: vi.fn(),
  onParse: vi.fn(), onDelete: vi.fn(), onRemoveFromCurrentFolder: vi.fn(),
};

it("shows row checkboxes only after entering selection mode", () => {
  const { rerender } = render(<PaperTable {...props} />);
  expect(screen.queryByRole("button", { name: "选择论文" })).toBeNull();
  rerender(<PaperTable {...props} selectionMode />);
  expect(screen.getByRole("button", { name: "选择论文" })).toBeTruthy();
});

it("toggles a paper star directly from the list row", () => {
  const onToggleStar = vi.fn();
  render(<PaperTable {...props} onToggleStar={onToggleStar} />);
  fireEvent.click(screen.getByRole("button", { name: "收藏论文" }));
  expect(onToggleStar).toHaveBeenCalledWith(paper);
  expect(props.onFocus).not.toHaveBeenCalled();
});

it("paints selection across rows while a checkbox is held", () => {
  const second = { ...paper, id: "paper-2", title: "Second Paper" };
  const onSelectionDragStart = vi.fn();
  const onSelectionDragEnter = vi.fn();
  render(<PaperTable
    {...props}
    papers={[paper, second]}
    selectionMode
    onSelectionDragStart={onSelectionDragStart}
    onSelectionDragEnter={onSelectionDragEnter}
  />);

  fireEvent.pointerDown(screen.getAllByRole("button", { name: "选择论文" })[0], {
    button: 0,
    isPrimary: true,
  });
  fireEvent.pointerEnter(screen.getAllByRole("row")[1]);

  expect(onSelectionDragStart).toHaveBeenCalledWith("paper-1", false);
  expect(onSelectionDragEnter).toHaveBeenCalledWith("paper-2");
});

it("enters selection when a paper row is held", () => {
  vi.useFakeTimers();
  const onLongPress = vi.fn();
  render(<PaperTable {...props} onLongPress={onLongPress} />);
  const row = screen.getByRole("row");
  fireEvent.pointerDown(row, { button: 0, isPrimary: true, clientX: 20, clientY: 20 });
  act(() => vi.advanceTimersByTime(500));
  expect(onLongPress).toHaveBeenCalledWith("paper-1");
  vi.useRealTimers();
});
