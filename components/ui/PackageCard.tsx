import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";

export interface PackageCardMember {
  id: string;
  name: string;
  completed?: boolean;
}

interface PackageCardShared {
  eyebrow: string;
  title: string;
  /** Ex.: "Dia 12 / 28" */
  tagLabel: string;
  chapterLabel: string;
  percent: number;
}

export interface ActivePackageCardProps extends PackageCardShared {
  variant: "active";
  members: PackageCardMember[];
  actionLabel: string;
  actionHref: string;
}

export interface SecondaryPackageCardProps extends PackageCardShared {
  variant: "secondary";
}

export type PackageCardProps = ActivePackageCardProps | SecondaryPackageCardProps;

// Extraído de components/home/ActivePackageCard.tsx e SecondaryPackageCard.tsx.
export function PackageCard(props: PackageCardProps) {
  if (props.variant === "active") {
    const { eyebrow, title, tagLabel, chapterLabel, percent, members, actionLabel, actionHref } = props;
    return (
      <div className="flex flex-col gap-4 rounded-[20px] bg-card-dark p-[18px]">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-[#a08e78]">{eyebrow}</div>
            <div className="text-[calc(18px*var(--font-scale))] font-semibold text-[#f7f1e6]">{title}</div>
          </div>
          <span className="whitespace-nowrap rounded-full border border-[#4a3d2c] px-2.5 py-1 text-[calc(10px*var(--font-scale))] tracking-wide text-[#cdbb9e]">
            {tagLabel}
          </span>
        </div>

        <div>
          <div className="mb-[9px] flex items-baseline justify-between">
            <span className="text-[calc(13px*var(--font-scale))] text-[#d8c9b3]">{chapterLabel}</span>
            <span className="text-[calc(13px*var(--font-scale))] font-semibold text-[#f7f1e6]">{percent}%</span>
          </div>
          <ProgressBar percent={percent} tone="dark" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex">
            {members.map((member) => (
              <div
                key={member.id}
                title={member.name}
                className={`-ml-[7px] flex h-[27px] w-[27px] items-center justify-center rounded-full text-[calc(11px*var(--font-scale))] font-semibold first:ml-0 ${
                  member.completed ? "bg-ink text-background" : "bg-[#e2d8c6] text-[#a08e78]"
                }`}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <Link href={actionHref} className="rounded-full bg-[#f3ebdc] px-[18px] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-card-dark">
            {actionLabel}
          </Link>
        </div>
      </div>
    );
  }

  const { eyebrow, title, tagLabel, chapterLabel, percent } = props;
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-[18px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-text-muted">{eyebrow}</div>
          <div className="text-[calc(18px*var(--font-scale))] font-semibold text-ink">{title}</div>
        </div>
        <span className="whitespace-nowrap rounded-full border border-[#e0d3bf] px-2.5 py-1 text-[calc(10px*var(--font-scale))] tracking-wide text-text-muted">
          {tagLabel}
        </span>
      </div>

      <div>
        <div className="mb-[9px] flex items-baseline justify-between">
          <span className="text-[calc(13px*var(--font-scale))] text-link">{chapterLabel}</span>
          <span className="text-[calc(13px*var(--font-scale))] font-semibold text-text-secondary">{percent}%</span>
        </div>
        <ProgressBar percent={percent} tone="light" />
      </div>
    </div>
  );
}
