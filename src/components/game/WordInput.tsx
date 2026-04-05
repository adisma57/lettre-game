interface WordInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isValid?: boolean | null;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  submitLabel?: string;
}

export function WordInput({
  value,
  onChange,
  onSubmit,
  isValid,
  error,
  placeholder = "Entrez un mot...",
  disabled = false,
  submitLabel = "Valider",
}: WordInputProps) {
  const ringColor =
    isValid === true  ? "border-success [box-shadow:0_0_0_1px_theme(colors.success)]" :
    isValid === false ? "border-error [box-shadow:0_0_0_1px_theme(colors.error)]"   :
                        "border-line focus-within:border-primary/60 focus-within:[box-shadow:0_0_0_1px_rgba(249,115,22,0.4)]";

  return (
    <div>
      <div className={`flex gap-2 rounded-xl border-2 bg-surface p-1 transition-all ${ringColor}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit();
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-3 py-1.5 font-mono text-base text-fg outline-none placeholder:text-muted/50 disabled:opacity-50"
          autoFocus
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="btn-shine shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:text-sm"
        >
          {submitLabel}
        </button>
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-error">
          <span>✕</span> {error}
        </p>
      )}
    </div>
  );
}
