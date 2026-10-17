"use client";

import { Input } from "@gotham/ui/components/ui/input";
import { useState } from "react";
import { NativeSelect } from "@/components/forms/native-select";

const CUSTOM = "__custom__";

type CategorySelectProps = {
  id: string;
  options: string[];
  value: string;
  onChange: (category: string) => void;
  invalid?: boolean;
};

/** The known categories, or "Custom…" to type a new one. */
export function CategorySelect({ id, options, value, onChange, invalid }: CategorySelectProps) {
  const [custom, setCustom] = useState(value !== "" && !options.includes(value));

  return (
    <div className="grid gap-2">
      <NativeSelect
        id={id}
        className="w-full"
        aria-invalid={invalid}
        value={custom ? CUSTOM : value}
        onChange={(event) => {
          const next = event.target.value;
          setCustom(next === CUSTOM);
          onChange(next === CUSTOM ? "" : next);
        }}
      >
        <option value="" disabled>
          Choose a category
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM}>+ Custom category…</option>
      </NativeSelect>
      {custom && (
        <Input
          autoFocus
          aria-label="Custom category"
          placeholder="e.g. Batmobile fuel"
          maxLength={50}
          value={value}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
