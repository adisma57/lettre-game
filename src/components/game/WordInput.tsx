import { Button } from "../ui/Button";

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
                        "border-line";

  return (
    <div>
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit();
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 rounded-lg border-2 bg-surface px-4 py-2 text-fg outline-none placeholder:text-muted focus:border-primary ${borderColor}`}
          autoFocus
        />
        <Button onClick={onSubmit} disabled={disabled || !value.trim()}>
          {submitLabel}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
