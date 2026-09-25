import { Check, FileText } from "lucide-react";
import type { ReadingStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const KNOWN_VENUES = [
  "ACL", "EMNLP", "NAACL", "COLING", "ICML", "NeurIPS", "NIPS", "ICLR",
  "CVPR", "ICCV", "ECCV", "AAAI", "IJCAI", "KDD", "WWW", "SIGIR", "CHI",
  "OSDI", "SOSP", "USENIX", "IEEE", "ACM", "Nature", "Science", "arXiv",
];

export function venueShortName(venue: string | null): string | null {
  if (!venue?.trim()) return null;
  const exact = KNOWN_VENUES.find((name) =>
    new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(venue),
  );
  if (exact) return exact === "NIPS" ? "NeurIPS" : exact;
  const words = venue.match(/[A-Za-z][A-Za-z-]*/g) ?? [];
  const initials = words.filter((word) => !/^(of|the|and|on|for|in)$/i.test(word)).map((word) => word[0]).join("");
  return (initials || venue).slice(0, 5).toUpperCase();
}

export function VenueBadge({ venue, compact = false, status }: { venue: string | null; compact?: boolean; status?: ReadingStatus }) {
  const short = venueShortName(venue);
  if (!short) {
    return (
      <span title="未识别期刊或会议" className="relative flex h-6 w-8 shrink-0 items-center justify-center rounded-md bg-zp-surface-hover text-zp-quaternary">
        <FileText className="h-3.5 w-3.5" />
        <StatusMark status={status} />
      </span>
    );
  }
  return (
    <span title={venue ?? short} className={cn(`${compact ? "h-6 min-w-8 px-1" : "h-7 min-w-9 px-1.5"} relative flex shrink-0 items-center justify-center rounded-md border bg-zp-surface text-[9px] font-semibold tracking-tight`, status === "unread" ? "border-zp-tertiary text-zp-primary" : status === "read" ? "border-zp-border text-zp-quaternary" : "border-zp-border text-zp-secondary")}>
      {short}
      <StatusMark status={status} />
    </span>
  );
}

function StatusMark({ status }: { status?: ReadingStatus }) {
  if (!status) return null;
  if (status === "read") {
    return <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-zp-tertiary text-white dark:border-zp-surface"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>;
  }
  return <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-zp-surface", status === "unread" ? "bg-zp-primary" : "bg-amber-500")} />;
}
