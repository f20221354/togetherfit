"use client";

import { InputHTMLAttributes, useId, useState } from "react";
import clsx from "clsx";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function PasswordField({ label, error, hint, className, id, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={clsx(
            "w-full rounded-xl border bg-surface-2 px-3.5 py-2.5 pr-16 text-sm text-foreground outline-none transition-colors",
            "placeholder:text-muted focus:border-accent",
            error ? "border-danger" : "border-border",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground"
          tabIndex={-1}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
