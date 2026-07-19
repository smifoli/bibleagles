"use client";

import { useRouter } from "next/navigation";
import type { BibleVersion } from "@/lib/bible-versions";

interface VersionSelectProps {
  version: string;
  versions: BibleVersion[];
}

export function VersionSelect({ version, versions }: VersionSelectProps) {
  const router = useRouter();

  function handleChange(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("version", next);
    router.push(`${url.pathname}${url.search}`);
  }

  return (
    <select
      value={version}
      onChange={(event) => handleChange(event.target.value)}
      className="rounded-full border border-[#d4c5ac] bg-transparent px-3 py-1.5 text-[calc(11px*var(--font-scale))] font-semibold text-ink"
    >
      {versions.map((item) => (
        <option key={item.abbreviation} value={item.abbreviation}>
          {item.abbreviation}
        </option>
      ))}
    </select>
  );
}
