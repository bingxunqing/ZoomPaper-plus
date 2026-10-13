import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PaperFolderPicker } from "@/components/library/PaperFolderPicker";
import type { Folder, Paper } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  applyFolderChanges: vi.fn(),
}));

import { applyFolderChanges } from "@/lib/api";

const folders: Folder[] = [
  { id: "folder-a", name: "方法", parent_id: null, color: "blue", tags: [], created_at: 1 },
  { id: "folder-b", name: "实验", parent_id: null, color: "green", tags: [], created_at: 2 },
];

function paper(folderIds: string[], id = "paper-1"): Paper {
  return {
    id,
    title: "Paper",
    authors: null,
    abstract: null,
    pdf_path: "/paper.pdf",
    md_path: "/paper.md",
    blog_md_path: null,
    created_at: 1,
    last_read_at: null,
    reading_status: "unread",
    parse_status: "ready",
    starred: false,
    finished_at: null,
    source_url: null,
    github_url: null,
    venue: null,
    deleted_at: null,
    source_icon_url: null,
    total_read_seconds: 0,
    folder_ids: folderIds,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PaperFolderPicker", () => {
  it("shows the new check after adding a paper when several folders exist", async () => {
    vi.mocked(applyFolderChanges).mockResolvedValue(1);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(
      <PaperFolderPicker
        open
        onOpenChange={vi.fn()}
        papers={[paper(["folder-a"])]}
        folders={folders}
        onChanged={onChanged}
        onError={vi.fn()}
      />
    );
    const first = screen.getByRole("checkbox", { name: /方法/ });
    const second = screen.getByRole("checkbox", { name: /实验/ });
    expect(first.getAttribute("aria-checked")).toBe("true");
    expect(second.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(second);
    expect(second.getAttribute("aria-checked")).toBe("true");
    expect(applyFolderChanges).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    await waitFor(() => expect(applyFolderChanges).toHaveBeenCalledOnce());
    expect(first.getAttribute("aria-checked")).toBe("true");
    expect(applyFolderChanges).toHaveBeenCalledWith(["paper-1"], [{folderId:"folder-b",contains:true}]);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("shows mixed membership and submits the batch atomically", async () => {
    vi.mocked(applyFolderChanges).mockResolvedValue(1);
    const existing = paper(["folder-a"], "paper-1");
    const missing = paper([], "paper-2");
    const onChanged = vi.fn().mockResolvedValue(undefined);

    render(
      <PaperFolderPicker
        open
        onOpenChange={vi.fn()}
        papers={[existing, missing]}
        folders={folders}
        onChanged={onChanged}
        onError={vi.fn()}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /方法/ });
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
    fireEvent.click(checkbox);
    expect(applyFolderChanges).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    await waitFor(() => expect(applyFolderChanges).toHaveBeenCalledWith(["paper-1","paper-2"], [{folderId:"folder-a",contains:true}]));
    expect(onChanged).toHaveBeenCalledOnce();
  });
});
