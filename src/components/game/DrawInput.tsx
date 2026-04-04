import { useRef } from "react";
import type { KeyboardEvent } from "react";

interface DrawInputProps {
  letters: string[];
  onChange: (index: number, value: string) => void;
  className?: string;
}

export function DrawInput({ letters, onChange, className = "" }: DrawInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  function handleChange(i: number, raw: string) {
    const char = raw.replace(/[^A-Za-z]/g, "").slice(-1).toUpperCase();
    onChange(i, char);
    if (char) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && letters[i] === "") {
      inputRefs.current[i - 1]?.focus();
    }
  }

  return (
    <div className={`flex gap-3 ${className}`}>
      {letters.map((letter, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          maxLength={1}
          value={letter}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-14 rounded-lg border border-line bg-surface text-center text-2xl font-bold text-primary uppercase outline-none transition-colors focus:border-primary"
        />
      ))}
    </div>
  );
}
