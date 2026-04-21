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
  const borderColor =
    isValid === true  ? "border-success" :
    isValid === false ? "border-error"   :
                        "border-primary/50 focus-within:border-primary/80";

  return (
    <div>
      <div className="flex gap-2.5">
        {/* Input field */}
        <div className={`flex flex-1 h-12 items-center rounded-xl border bg-surface px-3.5 transition-colors ${borderColor}`}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) onSubmit();
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="min-w-0 flex-1 bg-transparent font-mono text-lg font-semibold tracking-widest text-fg outline-none placeholder:text-muted/40 disabled:opacity-50"
            autoFocus
          />
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="btn-shine h-12 shrink-0 rounded-xl bg-primary px-5 font-display text-sm font-bold tracking-[0.04em] text-white transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-40"
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
