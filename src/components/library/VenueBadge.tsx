import { FileText } from "lucide-react";

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

export function VenueBadge({ venue, compact = false }: { venue: string | null; compact?: boolean }) {
  const short = venueShortName(venue);
  if (!short) {
    return (
      <span title="未识别期刊或会议" className="flex h-6 w-8 shrink-0 items-center justify-center rounded-md bg-zp-surface-hover text-zp-quaternary">
        <FileText className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span title={venue ?? short} className={`${compact ? "h-6 min-w-8 px-1" : "h-7 min-w-9 px-1.5"} flex shrink-0 items-center justify-center rounded-md border border-zp-border bg-zp-surface text-[9px] font-semibold tracking-tight text-zp-secondary`}>
      {short}
    </span>
  );
}
