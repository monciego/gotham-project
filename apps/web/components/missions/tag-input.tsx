"use client";

import { X } from "lucide-react";
import { useState } from "react";

type TagInputProps = {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
};

/** Tags as chips. Enter or a comma adds one; Backspace on an empty input removes the last. */
export function TagInput({ id, value, onChange, max = 10 }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tags = raw
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag && !value.includes(tag));
    if (tags.length) {
      onChange([...value, ...tags].slice(0, max));
    }
    setDraft("");
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-input/30 px-2 py-1 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((item) => item !== tag))}
            aria-label={`Remove ${tag}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => (event.target.value.includes(",") ? add(event.target.value) : setDraft(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(draft);
          } else if (event.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        disabled={value.length >= max}
        placeholder={value.length ? "" : "work, health, family"}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
