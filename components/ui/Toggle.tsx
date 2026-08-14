export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

// Padrão do switch do perfil (hoje em NotificationsSettingsCard e afins), extraído como componente reutilizável.
export function Toggle({ checked, onChange, disabled = false, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-ink" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-[#f5efe4] transition-all ${
          checked ? "right-[3px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}
