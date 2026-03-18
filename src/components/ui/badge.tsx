import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center font-[var(--font-weight-medium)] transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
        brand: 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]',
        success: 'bg-[var(--color-success-50)] text-[var(--color-success-700)]',
        warning: 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]',
        error: 'bg-[var(--color-error-50)] text-[var(--color-error-700)]',
        info: 'bg-[var(--color-info-50)] text-[var(--color-info-700)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-[var(--font-size-xs)] rounded-[var(--radius-md)]',
        md: 'px-3 py-1 text-[var(--font-size-sm)] rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot = false, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot && (
        <span
          className={cn(
            'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-[var(--color-success-500)]',
            variant === 'warning' && 'bg-[var(--color-warning-500)]',
            variant === 'error' && 'bg-[var(--color-error-500)]',
            variant === 'info' && 'bg-[var(--color-info-500)]',
            variant === 'brand' && 'bg-[var(--color-brand-500)]',
            (!variant || variant === 'default') && 'bg-[var(--color-text-tertiary)]',
          )}
        />
      )}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
