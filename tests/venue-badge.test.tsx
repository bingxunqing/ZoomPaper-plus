import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VenueBadge, conferenceIcon } from "../src/components/library/VenueBadge";

describe("VenueBadge", () => {
  it("uses the bundled ICLR icon for recognized ICLR papers", () => {
    expect(conferenceIcon("ICLR 2026", null)).toBe("/venue-icons/iclr.ico");
    expect(conferenceIcon(null, "https://proceedings.iclr.cc/paper_files/paper/2026/hash/example.html"))
      .toBe("/venue-icons/iclr.ico");

    const { container } = render(<VenueBadge venue="ICLR 2026" sourceUrl="https://proceedings.iclr.cc/paper" compact />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/venue-icons/iclr.ico");
  });
});
