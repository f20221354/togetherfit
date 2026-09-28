"use client";

import { InputHTMLAttributes, useId } from "react";
import clsx from "clsx";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={clsx(
          "rounded-xl border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors",
          "placeholder:text-muted focus:border-accent",
          error ? "border-danger" : "border-border",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
