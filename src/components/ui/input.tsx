'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <LabelPrimitive.Root
            htmlFor={inputId}
            className={cn(
              'text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]',
              disabled && 'opacity-50',
            )}
          >
            {label}
          </LabelPrimitive.Root>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-[var(--radius-lg)] border bg-[var(--color-bg-primary)] px-3 py-2',
            'text-[var(--font-size-sm)] text-[var(--color-text-primary)]',
            'placeholder:text-[var(--color-text-tertiary)]',
            'transition-all duration-[var(--transition-normal)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-bg-secondary)]',
            error
              ? 'border-[var(--color-border-error)] focus-visible:ring-[var(--color-error-500)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-text-tertiary)]',
            className,
          )}
          ref={ref}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-[var(--font-size-xs)] text-[var(--color-error-500)]" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-[var(--font-size-xs)] text-[var(--color-text-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
