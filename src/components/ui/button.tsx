'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'rounded-[var(--radius-lg)] transition-all duration-[var(--transition-normal)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    'cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--color-brand-600)] btn-text-inverse',
          'hover:bg-[var(--color-brand-700)]',
          'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
        ].join(' '),
        secondary: [
          'bg-[var(--color-bg-tertiary)] btn-text-primary',
          'hover:bg-[var(--color-border)]',
        ].join(' '),
        danger: [
          'bg-[var(--color-error-500)] btn-text-inverse',
          'hover:bg-[var(--color-error-700)]',
          'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
        ].join(' '),
        ghost: ['btn-text-brand', 'hover:bg-[var(--color-brand-50)]'].join(' '),
        outline: [
          'border border-[var(--color-border)] bg-transparent btn-text-primary',
          'hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-tertiary)]',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-[var(--font-size-sm)]',
        md: 'h-10 px-4 text-[var(--font-size-sm)]',
        lg: 'h-12 px-6 text-[var(--font-size-base)]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
