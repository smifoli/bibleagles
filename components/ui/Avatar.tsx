export interface AvatarColorStyle {
  bg: string;
  text: string;
}

// Mesma paleta usada em ActivePackageCard/PackageStatsView (design/index.html .av-l/.av-a/.av-p/.av-...).
export const AVATAR_PALETTE: AvatarColorStyle[] = [
  { bg: "#b5723e", text: "#ffffff" },
  { bg: "#c98a52", text: "#ffffff" },
  { bg: "#3d3225", text: "#a08e78" },
  { bg: "#7d6c58", text: "#ffffff" },
];

// Estado "pendente" (convite não aceito, membro sem confirmação) — design/index.html .av-pending.
export const AVATAR_PENDING_STYLE: AvatarColorStyle = { bg: "#e2d8c6", text: "#a08e78" };

const SIZE_CLASSES = {
  sm: "h-[22px] w-[22px] text-[calc(10px*var(--font-scale))]",
  md: "h-[27px] w-[27px] text-[calc(11px*var(--font-scale))]",
  lg: "h-[68px] w-[68px] text-[calc(26px*var(--font-scale))] border-2 border-[#cdbfac]",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASSES;

export interface AvatarProps {
  name: string;
  /** Índice na paleta de cores por membro; ciclos automaticamente se exceder o tamanho da paleta. */
  colorIndex?: number;
  size?: AvatarSize;
  /** Estilo neutro para membro pendente/sem atividade, sobrepõe colorIndex. */
  pending?: boolean;
  className?: string;
  /** Foto de perfil, se o usuário tiver uma — substitui a bolinha com a inicial. */
  avatarUrl?: string | null;
  /** Contorno colorido (ex.: cor do destaque) — só faz sentido junto de avatarUrl. */
  borderColor?: string;
  /** Sobrepõe colorIndex/pending com uma cor específica (ex.: cor do destaque) na bolinha com inicial. */
  fallbackColor?: AvatarColorStyle;
}

export function Avatar({
  name,
  colorIndex = 0,
  size = "md",
  pending = false,
  className = "",
  avatarUrl,
  borderColor,
  fallbackColor,
}: AvatarProps) {
  const style = fallbackColor ?? (pending ? AVATAR_PENDING_STYLE : AVATAR_PALETTE[colorIndex % AVATAR_PALETTE.length]);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        title={name}
        className={`shrink-0 rounded-full object-cover ${SIZE_CLASSES[size]} ${className}`}
        style={borderColor ? { border: `2px solid ${borderColor}` } : undefined}
      />
    );
  }

  return (
    <div
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-sans font-semibold ${SIZE_CLASSES[size]} ${className}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {initial}
    </div>
  );
}
